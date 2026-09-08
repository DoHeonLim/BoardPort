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
 * 2026.02.25  임도헌   Modified  Cloudflare 웹훅 등록 검증 메시지 서명 검증 우회 로직 추가 및 GET 엔드포인트 추가
 * 2026.03.05  임도헌   Modified  공통 데이터(상세)는 `revalidateTag` 유지, 개인화 데이터(목록/상태)는 Query Cache 기반 혼합 캐싱 정책 적용
 * 2026.03.07  임도헌   Modified  CONNECTED 재수신 시 ENDED -> CONNECTED 복구 허용, 재접속에는 시작 알림 재전송 방지
 * 2026.03.08  임도헌   Modified  video.ready가 실제 종료된 방송에만 안전하게 VOD를 연결하도록 fallback 제거
 * 2026.04.05  임도헌   Modified  게시글 동영상 draftKey를 READY 웹훅에서 조기 해제하지 않고 실제 게시글 연결 시점까지 유지
 * 2026.05.12  임도헌   Modified  게시글 동영상 READY 선도착/Cloudflare error 웹훅 처리 보강
 * 2026.05.17  임도헌   Modified  Cloudflare Stream 웹훅 페이로드 타입 명시
 * 2026.06.25  임도헌   Modified  production secret 누락 시 Stream/Destination 웹훅 fail-closed 처리
 * 2026.08.21  임도헌   Modified  클라이언트 상태 이벤트에서 원본 Live Input UID를 제거하고 Broadcast PK 사용
 * 2026.08.21  임도헌   Modified  방송 상태 이벤트를 식별자-only private 무효화 신호로 축소
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 * 2026.08.26  임도헌   Modified  inbox 중복 선점·provider 시각 순서 제어·outbox 후처리 적용
 */

import "server-only";
import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { isMissingRequiredCloudflareWebhookSecret } from "@/features/stream/utils/webhookAuth";
import {
  claimCloudflareWebhookEvent,
  failCloudflareWebhookEvent,
  processClaimedCloudflareWebhookEvent,
} from "@/features/stream/service/webhookProcessor";
import { processStreamWebhookOutboxBatch } from "@/features/stream/service/webhookOutbox";
import {
  createCloudflarePayloadHash,
  getCloudflareAssetUid,
  getCloudflareEventAt,
  getCloudflareEventType,
  getCloudflareLiveInputUid,
  getCloudflareProviderEventId,
} from "@/features/stream/utils/webhookPayload";
import type { CloudflareStreamAssetPayload } from "@/features/stream/types";

export const runtime = "nodejs";

/**
 * Cloudflare 계정/토큰 및 웹훅 시크릿
 * - DEST_SECRET                    : Destination Webhook 인증키 (헤더 기반)
 * - STREAM_SECRET                  : Stream Webhook (Webhook-Signature) HMAC 검증용
 */
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

/*                            메인 핸들러: GET / POST                          */

/**
 * 브라우저 접속(GET) 시 405 Method Not Allowed 대신 안내 문구를 출력
 * - 주로 엔드포인트 활성화 여부를 체크하거나 디버깅하는 용도
 */
export async function GET() {
  return NextResponse.json({
    message: "Cloudflare Webhook Endpoint is active. Use POST to send data.",
  });
}

/**
 * Cloudflare Stream Webhook 엔드포인트
 *
 * 처리 순서:
 * 1. 요청 바디(raw) 읽기 및 JSON 파싱
 * 2. Cloudflare 웹훅 등록 검증 메시지("Hello World!...") 확인 및 우회 처리 (200 OK)
 * 3. 이 웹훅이 Stream Webhook 인지(Destination Webhook 인지) 판별 및 서명 검증
 * 4. 원문 해시 기반 inbox 이벤트 선점 및 provider 시각 순서에 따른 DB 상태 전이
 * 5. transaction과 함께 적재한 outbox 후처리 작업 실행
 * 6. 중복 delivery는 성공 응답하고, 처리 실패는 inbox에 기록한 뒤 500 반환
 */
export async function POST(req: Request) {
  let claimedEventId: number | null = null;

  try {
    const raw = await req.text();
    // Cloudflare 웹훅 등록 검증/헬스체크용 빈 바디 대응
    if (!raw) return NextResponse.json({ ok: true });

    // 1) 서명 검증을 위해 바디를 먼저 파싱
    let body: CloudflareStreamAssetPayload = {};
    try {
      body = JSON.parse(raw) as CloudflareStreamAssetPayload;
    } catch {
      // Cloudflare가 간혹 text-only를 보낼 경우를 대비한 방어 로직
      return NextResponse.json(
        { ok: false, error: "BAD_JSON" },
        { status: 400 }
      );
    }

    // 2) [핵심] Cloudflare 웹훅 등록 검증 메시지 우회 처리 (Handshake Bypass)
    // Cloudflare 시스템에서 웹훅을 활성화할 때 서명 헤더 없이 검증 메시지를 보냄
    // 이 경우 서명 검증을 건너뛰고 성공 응답을 내려주어 웹훅이 정상 등록되게 함
    if (
      body?.text &&
      typeof body.text === "string" &&
      body.text.startsWith("Hello World! This is a test message")
    ) {
      console.log(
        "[webhooks/cloudflare] Received Cloudflare test message. Handshake successful."
      );
      return NextResponse.json({ ok: true, message: "Handshake Successful" });
    }

    // 3) 서명 및 인증 검증 로직 (실제 이벤트 처리용)
    const sigHeader = req.headers.get("webhook-signature");
    const isStreamWebhook = !!sigHeader;

    // production에서는 secret 누락을 검증 생략으로 처리하지 않고 상태 변경 이벤트를 fail-closed 한다.
    if (isStreamWebhook) {
      // Stream Webhook → HMAC 서명 검증
      if (
        isMissingRequiredCloudflareWebhookSecret({
          kind: "stream",
          streamSecret: STREAM_SECRET,
          destinationSecret: DEST_SECRET,
        })
      ) {
        return NextResponse.json(
          { ok: false, error: "WEBHOOK_SECRET_NOT_CONFIGURED" },
          { status: 500 }
        );
      }

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
      // Destination Webhook → 인증 헤더 확인 (옵션)
      if (
        isMissingRequiredCloudflareWebhookSecret({
          kind: "destination",
          streamSecret: STREAM_SECRET,
          destinationSecret: DEST_SECRET,
        })
      ) {
        return NextResponse.json(
          { ok: false, error: "WEBHOOK_SECRET_NOT_CONFIGURED" },
          { status: 500 }
        );
      }

      if (DEST_SECRET && !hasDestinationHeaderSecret(req, DEST_SECRET)) {
        return NextResponse.json(
          { ok: false, error: "UNAUTHORIZED" },
          { status: 401 }
        );
      }
    }

    const source = isStreamWebhook ? "STREAM" : "DESTINATION";
    const input = {
      source,
      eventType: getCloudflareEventType(body),
      providerEventId: getCloudflareProviderEventId(body),
      payloadHash: createCloudflarePayloadHash(source, raw),
      body,
      liveInputUid: getCloudflareLiveInputUid(body),
      assetUid: getCloudflareAssetUid(body),
      eventAt: getCloudflareEventAt(body),
    } as const;

    const claim = await claimCloudflareWebhookEvent(input);
    if (!claim.claimed) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        status: claim.status,
      });
    }

    claimedEventId = claim.eventId;
    const status = await processClaimedCloudflareWebhookEvent(
      claim.eventId,
      input
    );
    claimedEventId = null;

    // 핵심 DB 상태 전이는 이미 commit되었으므로 후처리 실패는 outbox 재시도에 맡긴다.
    const outbox = await processStreamWebhookOutboxBatch(10).catch((error) => {
      console.error("[webhooks/cloudflare] Outbox batch error:", error);
      return { claimed: 0, completed: 0, failed: 1 };
    });

    return NextResponse.json({ ok: true, status, outbox });
  } catch (e) {
    if (claimedEventId !== null) {
      await failCloudflareWebhookEvent(claimedEventId, e).catch(
        (recordError) => {
          console.error(
            "[webhooks/cloudflare] Failed to record inbox error:",
            recordError
          );
        }
      );
    }
    console.error("[webhooks/cloudflare] Global Handler Error:", e);
    return NextResponse.json(
      { ok: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
