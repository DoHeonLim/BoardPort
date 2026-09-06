/**
 * File Name : lib/env.ts
 * Description : 서버 보안 환경변수 검증 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   세션·rate limit·cron·앱 URL 환경변수 fail-closed 검증 추가
 * 2026.08.28  임도헌   Modified  PostgreSQL URL 검증과 병렬 조회를 고려한 pg Pool 설정 추가
 */

type RequiredEnvOptions = {
  minLength?: number;
  productionOnly?: boolean;
};

export type DatabasePoolConfig = {
  max: number;
  connectionTimeoutMillis: number;
  idleTimeoutMillis: number;
};

const DEFAULT_DATABASE_POOL_CONFIG: DatabasePoolConfig = {
  max: 5,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 10_000,
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

/** PrismaPg 런타임이 사용할 PostgreSQL 연결 URL을 필수값으로 반환한다. */
export function getDatabaseUrl(): string {
  const value = requireServerEnv("DATABASE_URL")!;

  try {
    const url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      !url.pathname ||
      url.pathname === "/"
    ) {
      throw new Error("invalid PostgreSQL URL");
    }
  } catch {
    throw new Error("[env] DATABASE_URL is missing or invalid.");
  }

  return value;
}

/** 양의 정수형 DB Pool 환경변수를 검증하고 미설정 시 안전한 기본값을 반환한다. */
function getPositiveIntegerEnv(name: string, fallback: number): number {
  const value = process.env[name]?.trim();
  if (!value) {
    return fallback;
  }

  if (!/^\d+$/.test(value)) {
    throw new Error(`[env] ${name} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`[env] ${name} must be a positive integer.`);
  }

  return parsed;
}

/** node-postgres Pool에 전달할 연결 수·대기 시간을 명시적으로 구성한다. */
export function getDatabasePoolConfig(): DatabasePoolConfig {
  return {
    max: getPositiveIntegerEnv(
      "DATABASE_POOL_MAX",
      DEFAULT_DATABASE_POOL_CONFIG.max
    ),
    connectionTimeoutMillis: getPositiveIntegerEnv(
      "DATABASE_CONNECTION_TIMEOUT_MS",
      DEFAULT_DATABASE_POOL_CONFIG.connectionTimeoutMillis
    ),
    idleTimeoutMillis: getPositiveIntegerEnv(
      "DATABASE_IDLE_TIMEOUT_MS",
      DEFAULT_DATABASE_POOL_CONFIG.idleTimeoutMillis
    ),
  };
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
  const isLocalhost =
    url.hostname === "localhost" || url.hostname === "127.0.0.1";
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
