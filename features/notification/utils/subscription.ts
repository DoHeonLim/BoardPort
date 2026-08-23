/**
 * File Name : features/notification/utils/subscription.ts
 * Description : Web Push 구독 payload 경계 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   endpoint와 브라우저 소유 증명 키 검증 추가
 * 2026.08.23  임도헌   Modified  p256dh·auth 키의 base64url canonical 형식과 byte 길이 검증
 */

import type { PushSubscriptionDTO } from "@/features/notification/types";
import { PUSH_DISPLAY_GUARD_VERSION } from "@/features/notification/utils/pushDisplayGuard";

const MAX_ENDPOINT_LENGTH = 4096;
const BASE64_URL_PATTERN = /^[A-Za-z0-9_-]+={0,2}$/;
const TRUSTED_PUSH_SERVICE_HOSTS = new Set([
  // Chromium 계열 Web Push/legacy GCM endpoint
  "fcm.googleapis.com",
  "android.googleapis.com",
]);
const TRUSTED_PUSH_SERVICE_SUFFIXES = [
  // Firefox Autopush, Safari Web Push, Windows/Edge WNS
  "push.services.mozilla.com",
  "push.apple.com",
  "notify.windows.com",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function decodeCanonicalBase64Url(value: unknown): Buffer | null {
  if (typeof value !== "string" || !BASE64_URL_PATTERN.test(value)) return null;

  try {
    const unpadded = value.replace(/=+$/, "");
    const decoded = Buffer.from(unpadded, "base64url");
    return decoded.toString("base64url") === unpadded ? decoded : null;
  } catch {
    return null;
  }
}

/** Web Push p256dh는 uncompressed P-256 public key(0x04 + 64 bytes)여야 한다. */
function isValidP256dh(value: unknown): value is string {
  const decoded = decodeCanonicalBase64Url(value);
  return decoded?.length === 65 && decoded[0] === 0x04;
}

/** Web Push auth secret은 RFC 8291 기준 16 bytes여야 한다. */
function isValidAuthSecret(value: unknown): value is string {
  return decodeCanonicalBase64Url(value)?.length === 16;
}

/**
 * 브라우저 공급자가 운영하는 Web Push endpoint인지 검증한다.
 *
 * 구독 API는 인증 사용자가 임의 URL을 저장하게 두면 발송 시 서버 측 HTTPS
 * 요청으로 이어지므로, 브라우저 Push 서비스의 443 endpoint만 허용한다.
 */
export function isTrustedPushEndpoint(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > MAX_ENDPOINT_LENGTH
  ) {
    return false;
  }

  try {
    const endpoint = new URL(value);
    const hostname = endpoint.hostname.toLowerCase();
    const hasTrustedHostname =
      TRUSTED_PUSH_SERVICE_HOSTS.has(hostname) ||
      TRUSTED_PUSH_SERVICE_SUFFIXES.some(
        (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`)
      );

    return (
      endpoint.protocol === "https:" &&
      endpoint.port === "" &&
      endpoint.username === "" &&
      endpoint.password === "" &&
      endpoint.hash === "" &&
      hasTrustedHostname
    );
  } catch {
    return false;
  }
}

/**
 * API/Server Action에 전달된 값을 신뢰 가능한 Push 구독 DTO로 변환한다.
 */
export function parsePushSubscriptionDTO(
  value: unknown
): PushSubscriptionDTO | null {
  if (!isRecord(value) || !isTrustedPushEndpoint(value.endpoint)) {
    return null;
  }

  const keys = value.keys;
  if (
    !isRecord(keys) ||
    !isValidP256dh(keys.p256dh) ||
    !isValidAuthSecret(keys.auth)
  ) {
    return null;
  }

  return {
    endpoint: value.endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  };
}

/**
 * 표시 전 계정 검증 기능이 확인된 Service Worker에서 보낸 구독만 받는다.
 * 구 클라이언트가 rolling deploy 중 fail-closed row를 되살리는 것을 막는다.
 */
export function parseGuardedPushSubscriptionDTO(
  value: unknown
): PushSubscriptionDTO | null {
  if (
    !isRecord(value) ||
    value.displayGuardVersion !== PUSH_DISPLAY_GUARD_VERSION
  ) {
    return null;
  }

  return parsePushSubscriptionDTO(value);
}
