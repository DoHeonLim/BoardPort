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
 */

import webPush from "web-push";
import db from "@/lib/db";
import type { NotificationType } from "@/features/notification/utils/policy";
import type { ServiceResult } from "@/lib/types";

export type SendPushResult = {
  sent: number;
  removed: number;
  disabled: number;
  errors: number;
};

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
function isWebPushError(error: unknown): error is WebPushError {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    "body" in error
  );
}

/* ---------- 타입별 기본 정책 ---------- */
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
    default:
      return "bp-system";
  }
}

function defaultsFor(type: NotificationType) {
  // 긴급도/TTL은 UX 관점에서 합리적 기본치로 설정
  // CHAT   : 실시간성이 중요 → high / 1시간
  // STREAM : LIVE 알림 위주 → high / 1시간
  // TRADE  : 거래 흐름 → normal / 12시간
  // REVIEW : 리뷰 관련 → normal / 12시간
  // BADGE  : 축하성 알림 → low / 24시간
  // SYSTEM : 가벼운 고지 → low / 6시간
  switch (type) {
    case "CHAT":
      return { urgency: "high" as const, ttlSeconds: 60 * 60 };
    case "STREAM":
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
function ensureMaxPayload(json: any): string {
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
      body = body.slice(0, Math.max(0, body.length - 120)) + "…";
      clone.body = body;
      const t = JSON.stringify(clone);
      bytes = encoder.encode(t);
      if (bytes.byteLength <= MAX_BYTES) return t;
    }
  }

  // 그래도 크면 이미지 제거 후 최종 시도
  delete clone.image;
  const final = JSON.stringify(clone);
  return final.length <= MAX_BYTES
    ? final
    : JSON.stringify({ title: json.title, body: "…" });
}

/**
 * 푸시 알림 발송 (다중 기기 지원)
 * - 대상 유저의 활성화된 모든 구독 정보를 조회하여 발송합니다.
 * - 만료된 구독(410/404)은 DB에서 자동 삭제합니다.
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
    const resolvedTTL = ttlSeconds ?? policy.ttlSeconds;

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
            }
          );

          results.sent += 1;

          // 성공 시 마지막 사용 시간 갱신
          // - last_used: 이 구독이 실제로 사용된 최근 시각
          // - isActive : 비정상 오류로 false가 된 구독을 복구하는 용도
          await db.pushSubscription.update({
            where: { id: sub.id },
            data: { last_used: new Date(), isActive: true },
          });
        } catch (err: unknown) {
          // Type Guard 적용
          if (isWebPushError(err)) {
            // 410 Gone, 404 Not Found -> 구독 만료
            if (err.statusCode === 410 || err.statusCode === 404) {
              results.removed += 1;
              await db.pushSubscription.delete({ where: { id: sub.id } });
            } else {
              // 그 외 에러 (403, 429, 500 등) -> 일시 비활성
              results.disabled += 1;
              await db.pushSubscription
                .update({ where: { id: sub.id }, data: { isActive: false } })
                .catch(() => {});
            }
            console.error("WebPush error:", {
              status: err.statusCode,
              body: err.body,
              endpoint: sub.endpoint,
            });
          } else {
            // 알 수 없는 에러
            console.error("Unknown Push error:", err);
            results.disabled += 1;
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
