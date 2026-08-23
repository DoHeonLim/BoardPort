/**
 * File Name : lib/env.ts
 * Description : 서버 보안 환경변수 검증 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   세션·rate limit·cron·앱 URL 환경변수 fail-closed 검증 추가
 */

type RequiredEnvOptions = {
  minLength?: number;
  productionOnly?: boolean;
};

/** 필수 환경변수의 존재 여부와 최소 길이를 한곳에서 검증한다. */
export function requireServerEnv(
  name: string,
  options: RequiredEnvOptions = {}
): string | null {
  const value = process.env[name]?.trim();
  if (options.productionOnly && process.env.NODE_ENV !== "production") {
    return value || null;
  }

  if (!value || value.length < (options.minLength ?? 1)) {
    throw new Error(`[env] ${name} is missing or invalid.`);
  }

  return value;
}

/** iron-session이 요구하는 32자 이상의 암호화 키를 반환한다. */
export function getCookiePassword(): string {
  return requireServerEnv("COOKIE_PASSWORD", { minLength: 32 })!;
}

/** 운영에서는 세션 암호화 키와 분리된 rate limit HMAC salt를 강제한다. */
export function getRateLimitSecret(): string | null {
  const salt = requireServerEnv("RATE_LIMIT_SALT", {
    minLength: 32,
    productionOnly: true,
  });
  return salt ?? process.env.COOKIE_PASSWORD?.trim() ?? null;
}

/** cron 인증은 환경에 관계없이 비밀값이 없으면 실행하지 않는다. */
export function getCronSecret(): string {
  return requireServerEnv("CRON_SECRET", { minLength: 12 })!;
}

/** 메일 링크 등에 사용할 신뢰 가능한 앱 origin을 반환한다. */
export function getTrustedAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!configured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("[env] NEXT_PUBLIC_APP_URL is missing or invalid.");
    }
    return "http://localhost:3000";
  }

  const url = new URL(configured);
  const isLocalhost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/" ||
    (url.protocol !== "https:" && !(isLocalhost && url.protocol === "http:"))
  ) {
    throw new Error("[env] NEXT_PUBLIC_APP_URL is missing or invalid.");
  }

  return url.origin;
}
