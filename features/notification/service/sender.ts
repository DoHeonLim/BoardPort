/**
 * File Name : features/notification/service/sender.ts
 * Description : 웹 푸시 발송 로직 (web-push 라이브러리 래퍼)
 * Author : 임도헌
 *
 * History
 * 2024.12.20  임도헌   Created
 * 2024.12.22  임도헌   Modified  푸시 알림 라이브러리 추가
 * 2025.01.12  임도헌   Modified  푸시 알림 이미지 추가
 * 2025.11.10  임도헌   Modified  tag/renotify 페이로드 지원, 410 만료 처리 보강
 * 2025.11.10  임도헌   Modified  topic/urgency/TTL 추가, env 가드, payload 4KB 보호, 결과 리포트
 * 2025.12.03  임도헌   Modified  STREAM 타입 추가(방송 알림용 기본 정책/태그), 주석 보강
 * 2026.01.19  임도헌   Moved     lib/notification -> features/notification/lib
 * 2026.01.23  임도헌   Modified  lib/push-notification -> service/sender 이동 및 경로 수정
 * 2026.02.12  임도헌   Modified  KEYWORD 타입 푸시 정책(Tag, Defaults) 추가
 * 2026.03.07  임도헌   Modified  SYSTEM 기본 tag가 KEYWORD로 폴스루되지 않도록 분기 수정
 * 2026.04.02  임도헌   Modified  푸시 결과 타입과 알림 타입을 notification/types 공용 정의로 분리
 * 2026.05.16  임도헌   Modified  푸시 payload 타입을 명시해 any 제거
 * 2026.05.18  임도헌   Modified  만료/해지된 Push 구독 정리는 expected cleanup으로 로깅 레벨 조정
 * 2026.05.19  임도헌   Modified  Web Push/DB 접근 service가 클라이언트 번들에 포함되지 않도록 server-only 가드 추가
 * 2026.08.13  임도헌   Modified  지연된 발송 결과가 로그아웃/소유권 이전 row를 덮어쓰지 않도록 CAS 보강
 * 2026.08.13  임도헌   Modified  표시 보호 payload, provider 검증, timeout과 기기별 발송 상한 추가
 * 2026.08.21  임도헌   Modified  최대 Push TTL을 24시간으로 고정하고 일반 전송 오류 집계 정합성 보완
 */

import "server-only";
import webPush from "web-push";
import db from "@/lib/db";
import type {
  NotificationType,
  SendPushResult,
} from "@/features/notification/types";
import { isTrustedPushEndpoint } from "@/features/notification/utils/subscription";
import type { ServiceResult } from "@/lib/types";

export type { SendPushResult } from "@/features/notification/types";

const PUSH_REQUEST_TIMEOUT_MS = 10_000;
const MAX_PUSH_SUBSCRIPTIONS_PER_DELIVERY = 10;
const MAX_PUSH_TTL_SECONDS = 60 * 60 * 24;

// Web Push 에러 타입 정의 (라이브러리 응답 구조 매핑)
interface WebPushError extends Error {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
}

interface SendNotificationProps {
  targetUserId: number;
  title: string;
  message: string;
  url?: string;
  type: NotificationType;
  image?: string;
  /** 같은 tag면 기존 알림을 교체(덮어쓰기) */
  tag?: string;
  /** 교체 시에도 소리/진동 재생 */
  renotify?: boolean;
  /**
   * 네트워크 레벨에서 collapse 용도 (HTTP/2 Push "Topic" 헤더)
   * 명시 안 하면 tag와 동일하게 설정
   */
  topic?: string;
  /**
   * 알림 긴급도 (spec: very-low | low | normal | high)
   * 기본값은 type별 정책으로 자동 결정됨
   */
  urgency?: "very-low" | "low" | "normal" | "high";
  /**
   * TTL(초). 기본값은 type별 정책으로 자동 결정됨
   */
  ttlSeconds?: number;
}

type WebPushPayload = {
  version: 1;
  recipientUserId: number;
  title: string;
  body: string;
  link?: string;
  type: NotificationType;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  renotify?: boolean;
  timestamp?: number;
  data?: Record<string, unknown>;
};

/* ---------- ENV & web-push 초기화 (프로세스 생애주기 1회) ---------- */
const VAPID_PUB = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIV = process.env.VAPID_PRIVATE_KEY;

if (!VAPID_PUB || !VAPID_PRIV) {
  // 서버 부팅 시점에 즉시 경고
  console.warn(
    "[push] VAPID keys are not configured. Web Push will fail until set."
  );
} else {
  // idempotent: 같은 값으로 재설정하면 web-push가 문제 없이 동작
  webPush.setVapidDetails("mailto:admin@board-port.com", VAPID_PUB, VAPID_PRIV);
}

// 타입 가드 함수
/** web-push 전송 오류에서 HTTP 상태를 읽을 수 있는지 판별한다. */
function isWebPushError(error: unknown): error is WebPushError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "body" in error
  );
}

/* ---------- 타입별 기본 정책 ---------- */
/** 알림 유형과 URL에 맞는 기본 Push 중복 제거 tag를 반환한다. */
function defaultTagByType(type: NotificationType, url?: string) {
  switch (type) {
    case "CHAT": {
      // 채팅방 기준으로 덮어쓰기 → /chats/:roomId 패턴이면 roomId로 태그 생성
      const m = url?.match(/\/chats\/([^/?#]+)/);
      return m ? `bp-chat-${m[1]}` : "bp-chat";
    }
    case "TRADE":
      // 동일 상품 트랜잭션 묶기 → /products/view/:id
      return "bp-trade";
    case "REVIEW":
      return "bp-review";
    case "BADGE":
      return "bp-badge";
    case "STREAM": {
      // /streams/:id 형태라면 스트림id를 tag로 사용 // 방송 알림은 방송/채널 단위로 덮어쓰기 가능
      const m = url?.match(/\/streams\/([^/?#]+)/);
      return m ? `bp-stream-${m[1]}` : "bp-stream";
    }
    case "SYSTEM":
      return "bp-system";
    case "KEYWORD": // 키워드 알림은 개별 건으로 쌓이는 게 좋으므로 unique tag 사용 권장 (여기선 url 기반)
      const m = url?.match(/\/products\/view\/([^/?#]+)/);
      return m ? `bp-keyword-${m[1]}` : "bp-keyword";
    default:
      return "bp-system";
  }
}

/** 알림 유형별 기본 아이콘·클릭 경로·표시 정책을 구성한다. */
function defaultsFor(type: NotificationType) {
  // 긴급도/TTL은 UX 관점에서 합리적 기본치로 설정
  // CHAT   : 실시간성이 중요 → high / 1시간
  // STREAM : LIVE 알림 위주 → high / 1시간
  // KEYWORD : 즉시 알아야함 → high / 1시간간
  // TRADE  : 거래 흐름 → normal / 12시간
  // REVIEW : 리뷰 관련 → normal / 12시간
  // BADGE  : 축하성 알림 → low / 24시간
  // SYSTEM : 가벼운 고지 → low / 6시간
  switch (type) {
    case "CHAT":
      return { urgency: "high" as const, ttlSeconds: 60 * 60 };
    case "STREAM":
      return { urgency: "high" as const, ttlSeconds: 60 * 60 };
    case "KEYWORD":
      return { urgency: "high" as const, ttlSeconds: 60 * 60 };
    case "TRADE":
    case "REVIEW":
      return { urgency: "normal" as const, ttlSeconds: 60 * 60 * 12 };
    case "BADGE":
      return { urgency: "low" as const, ttlSeconds: 60 * 60 * 24 };
    case "SYSTEM":
    default:
      return { urgency: "low" as const, ttlSeconds: 60 * 60 * 6 };
  }
}

/* ---------- 4KB payload 보호 ---------- */
/** provider 제한을 넘지 않도록 Push payload를 직렬화하고 가변 텍스트를 축약한다. */
function ensureMaxPayload(json: WebPushPayload): string {
  const text = JSON.stringify(json);
  // Node에서 문자열 길이는 코드 유닛 기준이라 대략 체크, 여유 버퍼를 둠(3800B)
  // 이미지 URL 등으로 4KB를 초과할 수 있어 본문을 우선 축약
  const MAX_BYTES = 3800;
  const encoder = new TextEncoder();
  let bytes = encoder.encode(text);
  if (bytes.byteLength <= MAX_BYTES) return text;

  // body만 줄여 재시도
  const clone = { ...json };
  if (typeof clone.body === "string") {
    let body = clone.body;
    // 120자 단위로 줄이면서 한도 맞추기
    while (body.length > 0) {
      const nextLength = Math.max(0, body.length - 120);
      body = nextLength === 0 ? "" : `${body.slice(0, nextLength)}…`;
      clone.body = body;
      const t = JSON.stringify(clone);
      bytes = encoder.encode(t);
      if (bytes.byteLength <= MAX_BYTES) return t;
    }
  }

  // 그래도 크면 이미지 제거 후 최종 시도
  delete clone.image;
  const final = JSON.stringify(clone);
  return encoder.encode(final).byteLength <= MAX_BYTES
    ? final
    : JSON.stringify({
        version: json.version,
        recipientUserId: json.recipientUserId,
        title: json.title.slice(0, 120),
        body: "...",
      });
}

/**
 * 푸시 알림 발송 (다중 기기 지원)
 *
 * [정책]
 * - CHAT/STREAM/KEYWORD: `urgency: 'high'`, `TTL: 1시간` (실시간성이 중요)
 * - TRADE/REVIEW: `urgency: 'normal'`, `TTL: 12시간`
 * - BADGE/SYSTEM: `urgency: 'low'`, `TTL: 6~24시간`
 *
 * [태그]
 * - 동일한 채팅방/방송에 대한 알림은 `tag`를 사용하여 기존 알림을 덮어씌움으로써
 *   알림 센터가 도배되는 것을 방지
 *
 * @param props - 알림 내용 및 옵션
 * @returns 전송 결과 통계 (sent, removed, errors 등)
 */
export async function sendPushNotification({
  targetUserId,
  title,
  message,
  url,
  type,
  image,
  tag,
  renotify,
  topic,
  urgency,
  ttlSeconds,
}: SendNotificationProps): Promise<ServiceResult<SendPushResult>> {
  try {
    if (!VAPID_PUB || !VAPID_PRIV) {
      console.error("[push] VAPID keys missing. Skipping send.");
      // 로직상 실패는 아니므로 success: false지만 코드로 구분
      return { success: false, error: "VAPID_NOT_CONFIGURED" };
    }

    // 1) 대상 유저의 활성화된 구독 정보 조회
    // - 하나의 유저가 여러 브라우저/디바이스에서 구독할 수 있으므로 N개 가능
    const subs = await db.pushSubscription.findMany({
      where: { userId: targetUserId, isActive: true },
      orderBy: [{ updated_at: "desc" }, { id: "desc" }],
      take: MAX_PUSH_SUBSCRIPTIONS_PER_DELIVERY,
    });

    if (!subs.length) {
      return {
        success: true,
        data: { sent: 0, removed: 0, disabled: 0, errors: 0 },
      };
    }

    // 2) 타입별 기본 정책(긴급도/TTL) 조회
    //    - CHAT/STREAM/TRADE 등 도메인에 따라 기본값 다르게 설정
    const policy = defaultsFor(type);

    // 3) tag/topic/긴급도/TTL 최종 결정
    //    - tag: 브라우저 Notification API의 tag와 매핑 (같은 tag → 알림 교체)
    //    - topic: HTTP/2 / 브라우저 구현체에서 collapse key처럼 사용
    //    - urgency: "very-low" | "low" | "normal" | "high"
    //    - TTL: 알림을 네트워크 단에서 얼마나 오래 보관할지(초)
    const resolvedTag = tag ?? defaultTagByType(type, url);
    const resolvedTopic = (topic ?? resolvedTag).slice(0, 32); // 일부 구현체는 topic 길이에 제한이 있어 32자로 방어
    const resolvedUrgency = urgency ?? policy.urgency;
    // 운영 drain 시간이 호출부별 임의 TTL에 의해 무한히 늘어나지 않도록
    // Web Push 보관 기간은 전 도메인에서 24시간을 넘기지 않는다.
    const requestedTTL =
      ttlSeconds !== undefined && Number.isFinite(ttlSeconds)
        ? ttlSeconds
        : policy.ttlSeconds;
    const resolvedTTL = Math.min(
      MAX_PUSH_TTL_SECONDS,
      Math.max(0, Math.trunc(requestedTTL))
    );

    // 4) Web Push payload 구성
    //    - body: 실제 표시될 메시지
    //    - link: 클릭 시 이동할 URL (Service Worker에서 사용)
    //    - type: 도메인 타입(CHAT/TRADE/STREAM 등) → 클라이언트에서 UI 분기 가능
    //    - image: 알림 썸네일
    //    - tag/renotify: 클라이언트 Notification API 옵션과 그대로 매핑
    //
    //    * ensureMaxPayload:
    //    - Web Push payload는 대략 4KB 제한이 있어, 초과 시 body를 줄이고
    //      그래도 크면 image 제거 → 최종적으로 안전한 크기로 줄이는 역할
    const payload = ensureMaxPayload({
      version: 1,
      recipientUserId: targetUserId,
      title,
      body: message,
      link: url,
      type,
      image,
      tag: resolvedTag,
      renotify: !!renotify,
    });

    // 5) 전송 결과 집계용 카운터
    //    - sent    : 실제 전송 성공 개수
    //    - removed : 410/404 등으로 구독 삭제된 개수
    //    - disabled: 일시적인 오류로 비활성 처리된 구독 개수
    //    - errors  : 전체 오류 횟수
    const results = {
      sent: 0,
      removed: 0,
      disabled: 0,
      errors: 0,
    };

    // 6) 모든 구독에 대해 병렬로 Web Push 전송
    //    - 각 구독(endpoint+p256dh+auth)에 동일 payload를 보내고
    //    - TTL/urgency/topic은 HTTP 헤더/프로토콜 레벨에서 사용됨
    await Promise.all(
      subs.map(async (sub) => {
        // 발송을 시작할 때 읽은 구독 snapshot이다. 원격 요청이 끝나기 전에
        // 로그아웃 또는 다른 계정으로 endpoint 소유권 이전이 일어날 수 있으므로,
        // 후속 DB 변경은 이 snapshot이 아직 활성 row와 정확히 일치할 때만 허용한다.
        const activeSubscriptionSnapshot = {
          id: sub.id,
          userId: sub.userId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          isActive: true,
        } as const;

        // 과거 느슨한 검증으로 저장됐을 수 있는 임의 URL도 발송 직전에
        // 제거해 Web Push 클라이언트가 서버 측 요청 수단이 되지 않도록 한다.
        if (!isTrustedPushEndpoint(sub.endpoint)) {
          results.removed += 1;
          await db.pushSubscription.deleteMany({
            where: activeSubscriptionSnapshot,
          });
          return;
        }

        try {
          await webPush.sendNotification(
            {
              // Web Push 엔드포인트 정보
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
            {
              // TTL: 이 알림을 브라우저/네트워크가 몇 초 동안 유지할지
              //      (기한이 지나면 알림이 도착하지 않을 수 있음)
              TTL: resolvedTTL,

              // urgency: 네트워크/디바이스가 이 푸시를 얼마나 우선 처리할지 힌트
              //          - high   : 채팅/라이브 알림처럼 실시간성이 중요한 것
              //          - normal : 거래/리뷰처럼 몇 시간 내에 보면 되는 것
              //          - low    : 뱃지/마케팅처럼 급하지 않은 것
              urgency: resolvedUrgency,

              // topic: 같은 topic을 가진 푸시는 일부 구현체에서
              //        네트워크 레벨에서 collapse(중복 합치기) 처리될 수 있음
              //        - 예: 동일 방송/채팅방에 대한 여러 알림을 하나로 묶는 용도
              topic: resolvedTopic,

              // Push 제공자 지연이 전체 서버 요청을 무기한 점유하지 않도록 제한
              timeout: PUSH_REQUEST_TIMEOUT_MS,
            }
          );

          results.sent += 1;

          // 성공 시에도 로그아웃으로 비활성화된 row를 되살리지 않고,
          // 동일 소유권 snapshot이 유지된 경우에만 마지막 사용 시간을 갱신한다.
          await db.pushSubscription.updateMany({
            where: activeSubscriptionSnapshot,
            data: { last_used: new Date() },
          });
        } catch (err: unknown) {
          // Type Guard 적용
          if (isWebPushError(err)) {
            // 410 Gone, 404 Not Found -> 구독 만료
            if (err.statusCode === 410 || err.statusCode === 404) {
              results.removed += 1;
              await db.pushSubscription.deleteMany({
                where: activeSubscriptionSnapshot,
              });
              console.info("WebPush subscription expired and removed:", {
                status: err.statusCode,
                endpoint: sub.endpoint,
              });
            } else {
              // 401/403은 VAPID 설정, 429/5xx는 provider 상태처럼 구독 자체와
              // 무관할 수 있다. 만료가 확정된 404/410 외에는 활성 상태를
              // 바꾸지 않아 일시 장애가 영구적인 사용자 재연결로 번지지 않게 한다.
              console.error("WebPush error:", {
                status: err.statusCode,
                body: err.body,
                endpoint: sub.endpoint,
              });
            }
          } else {
            // socket timeout/DNS 오류 같은 transport 예외는 endpoint 만료를
            // 증명하지 않으므로 구독은 유지하고 전송 오류로만 집계한다.
            console.error("Unknown Push error:", err);
          }
          results.errors += 1;
        }
      })
    );

    return { success: true, data: results };
  } catch (error) {
    console.error("Send notification error:", error);
    return { success: false, error: "Internal Server Error" };
  }
}
