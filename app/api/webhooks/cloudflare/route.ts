/**
 * File Name : app/api/webhooks/cloudflare/route.ts
 * Description : Cloudflare Stream 웹훅 수신 -> Broadcast/VodAsset 갱신 (WebCrypto HMAC 검증)
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
 * 2026.02.23  임도헌   Modified  Webhook 재전송 시 VOD 중복 생성 방지(P2002 무시) 및 에러 로깅 강화
 * 2026.02.25  임도헌   Modified  순서 보장 가드, VOD 소유권 검증 강화
 */

import "server-only";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import crypto from "node:crypto";
import db from "@/lib/db";
import { sendLiveStatusFromServer } from "@/features/stream/service/realtime";
import { sendLiveStartNotifications } from "@/features/notification/service/live";
import { Prisma } from "@/generated/prisma/client";

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
 * 예시 헤더 형식: "time=1680000000,sig1=abcdef..."
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
 * @param s - 검사할 문자열
 */
function looksHex(s: string) {
  return /^[0-9a-f]{32,}$/i.test(s);
}

/**
 * 16진수 문자열 → Uint8Array 변환
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
 * 상수 시간(constant-time) 바이트 배열 비교 (타이밍 공격 방지)
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

    if (!resp.ok) return;

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

      if (!broadcast?.thumbnail) {
        await db.broadcast.update({
          where: { id: broadcastId },
          data: { thumbnail: thumbnailUrl },
        });

        // 관련 캐시 무효화 (비동기 처리)
        try {
          revalidateTag(T.BROADCAST_DETAIL(broadcastId));
          revalidateTag(T.USER_STREAMS_ID(ownerId));
        } catch {}
      }
    }
  } catch {
    // 썸네일 추출 실패는 메인 로직에 치명적이지 않음
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
  if (b.status !== "CONNECTED" && b.status !== "ENDED") {
    const now = new Date();

    // 상태 업데이트 + started_at 기본값 세팅 + ended_at 초기화
    const updated = await db.broadcast.update({
      where: { id: b.id },
      data: {
        status: "CONNECTED",
        started_at: b.started_at ?? now,
        ended_at: null, // 재접속 시 종료 시간 초기화
      },
      select: { id: true, title: true, thumbnail: true },
    });
    // 썸네일 자동 채우기 시도 (이미지는 있어도 무시)
    try {
      await tryFillThumbnailFromCloudflare(liveInputUid, updated.id, li.userId);
    } catch {}

    // 상태 변경에 대한 캐시 무효화 (썸네일 여부와 무관하게 항상 수행)
    try {
      revalidateTag(T.BROADCAST_DETAIL(updated.id));
      revalidateTag(T.USER_STREAMS_ID(li.userId));
    } catch {}

    // 상태 변경을 Supabase Realtime 채널로 브로드캐스트
    try {
      await sendLiveStatusFromServer?.({
        streamId: liveInputUid,
        status: "CONNECTED",
        ownerId: li.userId,
      });
    } catch {}
    // 방송 시작 알림: 팔로워에게 STREAM 알림 + 푸시
    try {
      await sendLiveStartNotifications({
        broadcasterId: li.userId,
        broadcastId: updated.id,
        broadcastTitle: updated.title,
        broadcastThumbnail: updated.thumbnail,
      });
    } catch {}
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
        select: { id: true, status: true },
      },
    },
  });
  if (!li || li.broadcasts.length === 0) return;

  const b = li.broadcasts[0];
  if (b.status !== "ENDED") {
    await db.broadcast.update({
      where: { id: b.id },
      data: { status: "ENDED", ended_at: new Date() },
    });

    try {
      revalidateTag(T.BROADCAST_DETAIL(b.id));
      revalidateTag(T.USER_STREAMS_ID(li.userId));
      await sendLiveStatusFromServer?.({
        streamId: liveInputUid,
        status: "ENDED",
        ownerId: li.userId,
      });
    } catch {}
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
  // 소유자 식별 불가 시 데이터 정합성을 위해 처리 중단
  if (!liveInputUid) return;

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

  try {
    // VodAsset upsert
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
  } catch (e) {
    // 중복 생성 에러(P2002)는 무시하고 성공으로 간주 (Idempotency)
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      console.log(
        `[onVideoReady] VOD already exists (Idempotent skip): ${assetUid}`
      );
      return;
    }
    throw e; // 그 외 에러는 상위로 전파
  }

  // 캐시 무효화
  revalidateTag(T.BROADCAST_DETAIL(broadcastIdResolved));

  try {
    const owner = await db.broadcast.findUnique({
      where: { id: broadcastIdResolved },
      select: { liveInput: { select: { userId: true } } },
    });
    if (owner?.liveInput?.userId) {
      revalidateTag(T.USER_STREAMS_ID(owner.liveInput.userId));
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
    // Cloudflare 웹훅 등록 테스트용 빈 바디 대응
    if (!raw) return NextResponse.json({ ok: true });

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
        if (!ok)
          return NextResponse.json(
            { ok: false, error: "BAD_SIGNATURE" },
            { status: 401 }
          );
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
     * Vercel Serverless 환경에서는 응답을 보내기 전에 비동기 작업이 완료되어야 하므로
     * 모든 핵심 핸들러를 await 처리하여 프로세스 조기 종료를 방지
     */
    if (type === "unknown" && isReadyAsset) {
      // 무타입 ready 페이로드 대응
      if (!liveInputUid) {
        liveInputUid = getLiveInputUid({
          liveInput: body?.liveInput,
          input: body?.input,
        });
      }
      await onVideoReady(liveInputUid, body);
    } else if (type === "live_input.connected") {
      if (liveInputUid) await onConnected(liveInputUid);
    } else if (type === "live_input.disconnected") {
      if (liveInputUid) await onDisconnected(liveInputUid);
    } else if (type === "video.ready") {
      await onVideoReady(liveInputUid, body);
    }

    // 200 OK로 응답하여 재시도 방지
    return NextResponse.json({ ok: true });
  } catch (e) {
    // 치명적 시스템 오류만 로깅
    console.error("[webhooks/cloudflare] Global Handler Error:", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
