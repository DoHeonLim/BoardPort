/**
 * File Name : app/api/webhooks/cloudflare/route
 * Description : Cloudflare Stream 웹훅 수신 → Broadcast/VodAsset 갱신 (WebCrypto HMAC 검증)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.09.16  임도헌   Created   Cloudflare Stream 웹훅 기본 처리 로직 추가
 * 2025.09.17  임도헌   Modified  video.ready 무타입 바디 지원, assetUid/liveInputUid 분리,
 *                                Notifications 헤더/Stream HMAC 검증 강화,
 *                                WebCrypto 기반 HMAC 검증 도입
 * 2025.09.17  임도헌   Modified  방송 시작시 썸네일 자동 업데이트 기능 추가
 * 2025.11.22  임도헌   Modified  broadcast-list 캐시 태그 제거, 상세/user-streams-id 태그만 유지
 * 2026.01.08  임도헌   Modified  방송 재접속(CONNECTED) 시 ended_at 초기화(null) 추가
 */

import "server-only";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import crypto from "node:crypto";
import db from "@/lib/db";
import { sendLiveStatusFromServer } from "@/features/stream/lib/serverBroadcast";
import { sendLiveStartNotifications } from "@/features/notification/lib/sendLiveStartNotifications";

export const runtime = "nodejs";

/**
 * Cloudflare 계정/토큰 및 웹훅 시크릿
 * - CF_ACCOUNT / CF_TOKEN          : Cloudflare Stream REST API 호출용
 * - DEST_SECRET                    : Destination Webhook 인증키 (헤더 기반)
 * - STREAM_SECRET                  : Stream Webhook (Webhook-Signature) HMAC 검증용
 */
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID;
const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const DEST_SECRET = (process.env.CLOUDFLARE_WEBHOOK_SECRET ?? "").trim();
const STREAM_SECRET = (
  process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET ?? ""
).trim();

/**
 * WebCrypto (HMAC) 준비
 * - Node 18+: crypto.webcrypto
 * - 브라우저 환경에서도 동작 가능하도록 globalThis.crypto fallback
 */
const subtle = (crypto.webcrypto ?? globalThis.crypto).subtle;
const te = new TextEncoder();

/** 웹훅 타임스탬프 허용 편차(초) — 5분 */
const MAX_SKEW_SEC = 300;

/*                             서명/보안 유틸 함수                             */
/**
 * Webhook-Signature 헤더 파싱
 *
 * 예시 헤더 형식:
 *   "time=1680000000,sig1=abcdef..."
 *
 * @param header - Webhook-Signature 헤더 값
 * @returns 파싱된 time(문자열)과 sig1(hex 문자열) 또는 null
 */
function parseStreamSignature(
  header: string | null
): { time: string; sig1: string } | null {
  if (!header) return null;
  const kv: Record<string, string> = {};

  for (const p of header.split(",").map((s) => s.trim())) {
    const [k, v] = p.split("=", 2);
    if (k && v) kv[k.toLowerCase()] = v;
  }

  const time = kv["time"];
  const sig1 = kv["sig1"];

  return time && sig1 ? { time, sig1 } : null;
}

/**
 * 문자열이 16진수(hex) 형식인지 확인 (최소 32자)
 * - Cloudflare 대시보드에서 제공하는 hex key를 처리하기 위함
 *
 * @param s - 검사할 문자열
 */
function looksHex(s: string) {
  return /^[0-9a-f]{32,}$/i.test(s);
}

/**
 * 16진수 문자열 → Uint8Array 변환
 *
 * @param hex - 16진수 문자열
 */
function hexToBytes(hex: string): Uint8Array {
  const s = hex.trim();
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < s.length; i += 2) {
    out[i / 2] = parseInt(s.slice(i, i + 2), 16);
  }
  return out;
}

/**
 * 상수 시간(constant-time) 바이트 배열 비교
 * - 타이밍 공격 방지용
 *
 * @param a - 비교 대상 1
 * @param b - 비교 대상 2
 */
function ctEqual(a: Uint8Array, b: Uint8Array) {
  if (a.byteLength !== b.byteLength) return false;
  let v = 0;
  for (let i = 0; i < a.byteLength; i++) v |= a[i] ^ b[i];
  return v === 0;
}

/**
 * Cloudflare Stream Webhook HMAC 서명 검증 (WebCrypto 기반)
 *
 * 검증 절차:
 * 1) Webhook-Signature 헤더 파싱 → time / sig1 추출
 * 2) time 유효성 검증 (±MAX_SKEW_SEC 초 이내)
 * 3) 검증용 메시지 = `${time}.${rawBody}`
 * 4) secret을
 *    - UTF-8 그대로 사용한 HMAC-SHA256
 *    - hex 키로 해석한 HMAC-SHA256
 *    두 방식으로 서명, 어느 한쪽이라도 일치하면 OK
 *
 * @param raw - 요청 바디 원문 문자열
 * @param signatureHeader - Webhook-Signature 헤더 값
 * @param secret - 웹훅 시크릿 키
 */
async function verifyStreamSignatureWebCrypto(
  raw: string,
  signatureHeader: string | null,
  secret: string
) {
  const parsed = parseStreamSignature(signatureHeader);
  if (!parsed) return false;

  // 1) 타임스탬프 유효성 검사
  const now = Math.floor(Date.now() / 1000);
  const ts = parseInt(parsed.time, 10);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > MAX_SKEW_SEC) {
    return false;
  }

  // 2) 메시지 구성: `${time}.${body}`
  const source = `${parsed.time}.${raw}`;
  const provided = hexToBytes(parsed.sig1);

  // 3) UTF-8 키로 서명 후 비교
  {
    const keyUtf8 = await subtle.importKey(
      "raw",
      te.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedUtf8 = new Uint8Array(
      await subtle.sign("HMAC", keyUtf8, te.encode(source))
    );
    if (ctEqual(expectedUtf8, provided)) return true;
  }

  // 4) secret이 hex 문자열일 가능성에 대비한 fallback
  if (looksHex(secret)) {
    const keyHex = await subtle.importKey(
      "raw",
      hexToBytes(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const expectedHex = new Uint8Array(
      await subtle.sign("HMAC", keyHex, te.encode(source))
    );
    if (ctEqual(expectedHex, provided)) return true;
  }

  return false;
}

/**
 * Destination Webhook 인증 헤더 유효성 확인
 * - Cloudflare Notifications → Destination 으로 보낼 때 사용하는 커스텀 헤더들
 * - 기대하는 시크릿 값(DEST_SECRET)과 일치하는지 검사
 *
 * @param req - Next.js Request 객체
 * @param expected - 기대하는 시크릿 문자열
 */
function hasDestinationHeaderSecret(req: Request, expected: string) {
  const h = req.headers;
  const candidates = [
    h.get("cf-webhook-auth"),
    h.get("x-webhook-secret"),
    h.get("x-cloudflare-webhook-secret"),
  ].filter(Boolean) as string[];

  if (!candidates.length) return false;
  return candidates.some((v) => v.trim() === expected);
}

/*                              페이로드 파싱 유틸                             */
/**
 * 이벤트 타입 추출
 *
 * Cloudflare는 다양한 형식으로 타입을 넘길 수 있으므로
 * - body.type
 * - body.event / event_type
 * - body.result.type
 * - body.data.type / data.event_type
 * 순으로 넓게 검사한다.
 */
function getEventType(body: any): string {
  return (
    body?.type ||
    body?.event ||
    body?.event_type ||
    body?.result?.type ||
    body?.data?.type ||
    body?.data?.event_type ||
    "unknown"
  );
}

/**
 * 비디오 에셋 UID 추출
 *
 * Stream API / Notifications API 에 따라 위치가 달라질 수 있으므로
 * - body.uid
 * - body.data.uid
 * - body.result.uid
 * 세 곳을 모두 검사한다.
 */
function getAssetUid(body: any): string | null {
  if (typeof body?.uid === "string") return body.uid;
  if (typeof body?.data?.uid === "string") return body.data.uid;
  if (typeof body?.result?.uid === "string") return body.result.uid;
  return null;
}

/**
 * Live Input UID 추출
 *
 * Cloudflare 측에서 live input을 다음과 같이 보낼 수 있음:
 * - body.liveInput
 * - body.input
 * - body.data.liveInput
 * - body.data.input
 * - body.data.input_id (단순 문자열)
 *
 * 위 케이스를 모두 커버하도록 파싱.
 */
function getLiveInputUid(body: any): string | null {
  const li =
    body?.liveInput ??
    body?.input ??
    body?.data?.liveInput ??
    body?.data?.input;

  if (typeof li === "string") return li;
  if (li && typeof li === "object" && typeof li.uid === "string") return li.uid;
  if (typeof body?.data?.input_id === "string") return body.data.input_id;

  return null;
}

/**
 * 해당 페이로드가 Cloudflare Stream의 "비디오 준비 완료(video.ready)" 형태인지 판별
 *
 * 특징:
 * - readyToStream === true 또는 status.state === "ready" 또는 status === "ready"
 * - playback.hls / playback.dash 등 재생 정보가 포함
 * - uid(에셋 ID)가 존재
 *
 * Stream Webhook / Destination Webhook 모두 지원하기 위해
 * body.data 래핑이 있으면 우선 해제한 뒤 검사한다.
 */
function isAssetReadyPayload(body: any): boolean {
  // Destination Webhook의 경우 body.data 안에 실제 페이로드가 들어있는 경우가 많으므로 우선 언랩
  const src = body?.data ?? body;

  const ready =
    src?.readyToStream === true ||
    src?.status?.state === "ready" ||
    src?.status === "ready";

  const hasPlayback =
    !!src?.playback &&
    (src.playback.hls || src.playback.dash || typeof src.playback === "object");

  const uid = getAssetUid(body);

  return Boolean(ready && hasPlayback && typeof uid === "string");
}

/*                         Cloudflare API 연동 (썸네일)                         */
/**
 * Live Input에 연결된 비디오 목록을 Cloudflare API로 조회 후,
 * 적절한 썸네일을 자동으로 선택하여 Broadcast.thumbnail을 채워준다.
 *
 * 우선순위:
 * 1) status.state === "live-inprogress"
 * 2) status.state === "ready"
 * 3) 그 외 첫 번째 비디오
 *
 * 주의:
 * - 이미 thumbnail이 설정된 Broadcast는 덮어쓰지 않는다.
 * - 실패는 치명적이지 않으므로 콘솔 경고만 남기고 중단한다.
 */
async function tryFillThumbnailFromCloudflare(
  liveInputUid: string,
  broadcastId: number,
  ownerId: number
) {
  if (!CF_ACCOUNT || !CF_TOKEN) return;

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
      CF_ACCOUNT
    )}/stream/live_inputs/${encodeURIComponent(liveInputUid)}/videos`;

    const resp = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!resp.ok) {
      console.warn("[CF] videos fetch failed:", resp.status, await resp.text());
      return;
    }

    const json = await resp.json();
    const list: any[] = Array.isArray(json?.result) ? json.result : [];

    if (list.length === 0) return;

    // 우선순위: live-inprogress → ready → 첫 항목
    const chosen =
      list.find((v) => v?.status?.state === "live-inprogress") ||
      list.find((v) => v?.status?.state === "ready") ||
      list[0];

    const thumbnailUrl: string | undefined = chosen?.thumbnail;

    if (thumbnailUrl && typeof thumbnailUrl === "string") {
      const broadcast = await db.broadcast.findUnique({
        where: { id: broadcastId },
        select: { thumbnail: true },
      });

      // 이미 썸네일이 있으면 유지
      if (!broadcast?.thumbnail) {
        await db.broadcast.update({
          where: { id: broadcastId },
          data: { thumbnail: thumbnailUrl },
          select: { id: true },
        });

        // 방송 상세/리스트/유저 방송 목록 캐시 무효화
        revalidateTag(T.BROADCAST_DETAIL(broadcastId));
        revalidateTag(T.USER_STREAMS_ID(ownerId));
      }
    }
  } catch (err) {
    console.warn("[CF] fetch videos error:", err);
  }
}

/*                           이벤트 핸들러: CONNECTED                          */
/**
 * live_input.connected 이벤트 처리
 *
 * 역할:
 * - 해당 LiveInput과 연결된 "가장 최근 Broadcast"를 찾아 상태를 CONNECTED로 변경
 * - started_at이 비어있으면 현재 시각으로 채워줌
 * - 필요 시 Cloudflare API로부터 비디오 목록을 조회하여 썸네일 채우기
 * - Supabase Realtime 채널을 통해 실시간 상태 브로드캐스트
 */
async function onConnected(liveInputUid: string) {
  const li = await db.liveInput.findUnique({
    where: { provider_uid: liveInputUid },
    select: {
      id: true,
      userId: true,
      broadcasts: {
        orderBy: { created_at: "desc" },
        take: 1,
        select: { id: true, status: true, started_at: true, thumbnail: true },
      },
    },
  });
  if (!li || li.broadcasts.length === 0) return;

  const b = li.broadcasts[0];

  // 이미 CONNECTED가 아닐 때만 업데이트
  if (b.status !== "CONNECTED") {
    const now = new Date();

    // 상태 업데이트 + started_at 기본값 세팅 + ended_at 초기화
    const updated = await db.broadcast.update({
      where: { id: b.id },
      data: {
        status: "CONNECTED",
        started_at: b.started_at ?? now,
        ended_at: null, // 재접속 시 종료 시간 제거
      },
      select: { id: true, title: true, thumbnail: true },
    });

    // 썸네일 자동 채우기 시도 (이미지는 있어도 무시)
    try {
      await tryFillThumbnailFromCloudflare(liveInputUid, updated.id, li.userId);
    } catch (err) {
      console.warn("[onConnected] tryFillThumbnailFromCloudflare failed:", err);
    }

    // 상태 변경에 대한 캐시 무효화 (썸네일 여부와 무관하게 항상 수행)
    try {
      revalidateTag(T.BROADCAST_DETAIL(updated.id));
      revalidateTag(T.USER_STREAMS_ID(li.userId));
    } catch (err) {
      console.warn("[onConnected] revalidateTag failed:", err);
    }

    // 상태 변경을 Supabase Realtime 채널로 브로드캐스트
    try {
      await sendLiveStatusFromServer?.({
        streamId: liveInputUid,
        status: "CONNECTED",
        ownerId: li.userId,
      });
    } catch {
      // 브로드캐스트 실패는 치명적이지 않으므로 무시 (필요시 별도 로깅)
    }
    // 방송 시작 알림: 팔로워에게 STREAM 알림 + 푸시
    try {
      await sendLiveStartNotifications({
        broadcasterId: li.userId,
        broadcastId: updated.id,
        broadcastTitle: updated.title,
        broadcastThumbnail: updated.thumbnail,
      });
    } catch (err) {
      console.warn("[onConnected] sendLiveStartNotifications failed:", err);
    }
  }
}
/*                         이벤트 핸들러: DISCONNECTED                         */
/**
 * live_input.disconnected 이벤트 처리
 *
 * 역할:
 * - 해당 LiveInput과 연결된 "가장 최근 Broadcast"를 찾아 상태를 ENDED로 변경
 * - ended_at 타임스탬프를 현재 시각으로 설정
 * - 관련 캐시 태그 무효화
 * - Supabase Realtime 채널을 통해 실시간 상태 브로드캐스트
 */
async function onDisconnected(liveInputUid: string) {
  const li = await db.liveInput.findUnique({
    where: { provider_uid: liveInputUid },
    select: {
      id: true,
      userId: true,
      broadcasts: {
        orderBy: { created_at: "desc" },
        take: 1,
        select: { id: true, status: true, started_at: true, ended_at: true },
      },
    },
  });
  if (!li || li.broadcasts.length === 0) return;

  const b = li.broadcasts[0];
  if (b.status !== "ENDED") {
    const now = new Date();

    await db.broadcast.update({
      where: { id: b.id },
      data: { status: "ENDED", ended_at: now },
      select: { id: true },
    });

    // 방송 상세/리스트/유저 방송 목록 캐시 무효화
    revalidateTag(T.BROADCAST_DETAIL(b.id));
    revalidateTag(T.USER_STREAMS_ID(li.userId));

    // 상태 변경 브로드캐스트
    try {
      await sendLiveStatusFromServer?.({
        streamId: liveInputUid,
        status: "ENDED",
        ownerId: li.userId,
      });
    } catch {
      // 실패 무시
    }
  }
}

/*                         이벤트 핸들러: VIDEO.READY                          */

/**
 * video.ready 이벤트 처리
 *
 * 역할:
 * - Cloudflare 비디오 에셋 정보를 내부 VodAsset 테이블에 upsert
 *   - provider_asset_id (Cloudflare uid)
 *   - playback_hls / playback_dash
 *   - thumbnail_url
 *   - duration_sec
 *   - ready_at
 * - 어떤 Broadcast에 연결할지 결정:
 *   1) liveInputUid가 있으면 해당 LiveInput의 가장 최근 Broadcast
 *   2) 없으면 status가 ENDED인 Broadcast 중 가장 최근 것
 * - Broadcast와 연결된 후 방송 상세 캐시 무효화
 */
async function onVideoReady(liveInputUid: string | null, assetBody: any) {
  // data / result 래핑된 경우까지 모두 처리
  const src = assetBody?.data ?? assetBody?.result ?? assetBody;
  const assetUid = getAssetUid(assetBody);

  if (!assetUid) return;

  const playback_hls: string | null = src?.playback?.hls ?? null;
  const playback_dash: string | null = src?.playback?.dash ?? null;
  const thumbnail_url: string | null = src?.thumbnail ?? null;
  const duration_sec: number | null =
    typeof src?.duration === "number" ? Math.floor(src.duration) : null;

  const ready_at: Date | null = src?.readyToStreamAt
    ? new Date(src.readyToStreamAt)
    : src?.created
      ? new Date(src.created)
      : null;

  let broadcastIdResolved: number | null = null;

  // 1) liveInputUid로 연결된 방송 중 가장 최근 방송 찾기
  if (liveInputUid) {
    const li = await db.liveInput.findUnique({
      where: { provider_uid: liveInputUid },
      select: {
        broadcasts: {
          orderBy: { created_at: "desc" },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (li?.broadcasts?.length) {
      broadcastIdResolved = li.broadcasts[0].id;
    }
  }

  // 2) liveInputUid로 못 찾으면, 최근 종료된(ENDED) 방송에 연결
  if (!broadcastIdResolved) {
    const ended = await db.broadcast.findFirst({
      where: { status: "ENDED" },
      orderBy: { created_at: "desc" },
      select: { id: true },
    });
    broadcastIdResolved = ended?.id ?? null;
  }

  // 연결할 방송이 없다면 VOD는 생성하되 어느 방송에도 연결하지 않음
  if (!broadcastIdResolved) return;

  // VodAsset upsert (provider_asset_id 기준)
  await db.vodAsset.upsert({
    where: { provider_asset_id: assetUid },
    update: {
      playback_hls,
      playback_dash,
      thumbnail_url,
      duration_sec,
      ready_at: ready_at ?? undefined,
      broadcast: { connect: { id: broadcastIdResolved } },
    },
    create: {
      provider_asset_id: assetUid,
      playback_hls,
      playback_dash,
      thumbnail_url,
      duration_sec,
      ready_at: ready_at ?? undefined,
      broadcast: { connect: { id: broadcastIdResolved } },
    },
  });

  // 해당 방송 상세 캐시 무효화 (VOD 탭/버튼 등 갱신)
  revalidateTag(T.BROADCAST_DETAIL(broadcastIdResolved));

  // 리스트/유저 방송 목록 캐시도 최신화
  try {
    const owner = await db.broadcast.findUnique({
      where: { id: broadcastIdResolved },
      select: {
        liveInput: {
          select: { userId: true },
        },
      },
    });

    const ownerId = owner?.liveInput?.userId;
    if (ownerId) {
      revalidateTag(T.USER_STREAMS_ID(ownerId));
    }
  } catch (err) {
    console.warn("[onVideoReady] revalidateTag failed:", err);
  }
}

/*                            메인 핸들러: POST 웹훅                           */
/**
 * Cloudflare Stream Webhook 엔드포인트
 *
 * 처리 순서:
 * 1. 요청 바디(raw) 읽기
 * 2. 이 웹훅이 Stream Webhook 인지(Destination Webhook 인지) 판별
 *    - Webhook-Signature 헤더 존재 여부로 구분
 * 3. 서명/인증 검증
 *    - Stream Webhook : Webhook-Signature + HMAC 검증
 *    - Destination    : 커스텀 인증 헤더 유무 확인
 * 4. JSON 파싱 및 메타데이터 추출
 *    - event type (live_input.connected / disconnected / video.ready / …)
 *    - liveInputUid / assetUid
 * 5. 이벤트 타입에 따라 분기 처리
 *    - live_input.connected    → onConnected
 *    - live_input.disconnected → onDisconnected
 *    - video.ready (또는 type 없는 ready payload) → onVideoReady
 * 6. 모든 정상 흐름은 200 OK, 오류는 적절한 상태 코드와 함께 JSON 반환
 */
export async function POST(req: Request) {
  try {
    const raw = await req.text();

    const sigHeader = req.headers.get("webhook-signature");
    const isStreamWebhook = !!sigHeader;

    // 1) Stream Webhook → HMAC 서명 검증
    if (isStreamWebhook) {
      if (STREAM_SECRET) {
        const ok = await verifyStreamSignatureWebCrypto(
          raw,
          sigHeader,
          STREAM_SECRET
        );
        if (!ok) {
          return NextResponse.json(
            { ok: false, error: "BAD_SIGNATURE" },
            { status: 401 }
          );
        }
      }
    } else {
      // 2) Destination Webhook → 인증 헤더 확인 (옵션)
      if (DEST_SECRET && !hasDestinationHeaderSecret(req, DEST_SECRET)) {
        return NextResponse.json(
          { ok: false, error: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
    }

    // 3) JSON 파싱
    let body: any = {};
    try {
      body = JSON.parse(raw);
    } catch {
      // Cloudflare가 간혹 text-only를 보낼 경우를 대비한 방어 로직
      return NextResponse.json(
        { ok: false, error: "BAD_JSON" },
        { status: 400 }
      );
    }

    // 4) 공통 메타데이터 추출
    const type = getEventType(body);
    let liveInputUid = getLiveInputUid(body);

    // video.ready 판별용 플래그 (type이 unknown이어도 ready 페이로드면 처리)
    const isReadyAsset = isAssetReadyPayload(body);

    /* ------------------------------ video.ready(무타입) ------------------------------ */

    /**
     * 일부 설정에서는 type 필드 없이 video.ready 형태의 바디만 들어올 수 있다.
     * 이 경우 isAssetReadyPayload(body) 결과만으로도 video.ready 이벤트로 간주한다.
     */
    if (type === "unknown" && isReadyAsset) {
      // liveInputUid가 누락된 경우 payload 내 liveInput/input 필드에서 다시 시도
      if (!liveInputUid) {
        liveInputUid = getLiveInputUid({
          liveInput: body?.liveInput,
          input: body?.input,
        });
      }
      await onVideoReady(liveInputUid, body);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    /* ----------------------------- live_input.connected ----------------------------- */

    if (type === "live_input.connected") {
      if (!liveInputUid) {
        return NextResponse.json(
          { ok: false, error: "MISSING_LIVEINPUT_UID" },
          { status: 400 }
        );
      }
      await onConnected(liveInputUid);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    /* --------------------------- live_input.disconnected --------------------------- */

    if (type === "live_input.disconnected") {
      if (!liveInputUid) {
        return NextResponse.json(
          { ok: false, error: "MISSING_LIVEINPUT_UID" },
          { status: 400 }
        );
      }
      await onDisconnected(liveInputUid);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    /* ---------------------------------- video.ready --------------------------------- */

    if (type === "video.ready") {
      await onVideoReady(liveInputUid, body);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    /* ----------------------------- 기타 타입(무시, 200) ----------------------------- */

    // 알 수 없는 이벤트 타입이더라도 Cloudflare 쪽에는 성공 응답을 줘야
    // 재시도 폭주를 막을 수 있으므로 200 OK로 응답한다.
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[webhooks/cloudflare] error:", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
