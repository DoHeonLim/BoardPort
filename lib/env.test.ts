/**
 * File Name : lib/env.test.ts
 * Description : 서버 보안 환경변수 fail-closed 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   세션·rate limit·cron·trusted origin 환경변수 검증 추가
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getCookiePassword,
  getCronSecret,
  getRateLimitSecret,
  getTrustedAppBaseUrl,
} from "@/lib/env";

describe("server environment", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("짧은 세션 암호와 cron secret을 거부한다", () => {
    vi.stubEnv("COOKIE_PASSWORD", "short");
    vi.stubEnv("CRON_SECRET", "short");

    expect(() => getCookiePassword()).toThrow("COOKIE_PASSWORD");
    expect(() => getCronSecret()).toThrow("CRON_SECRET");
  });

  it("production에서 별도 RATE_LIMIT_SALT가 없으면 거부한다", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT_SALT", "");
    vi.stubEnv("COOKIE_PASSWORD", "cookie-password-at-least-32-characters");

    expect(() => getRateLimitSecret()).toThrow("RATE_LIMIT_SALT");
  });

  it("development에서는 COOKIE_PASSWORD를 rate limit fallback으로 쓴다", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("RATE_LIMIT_SALT", "");
    vi.stubEnv("COOKIE_PASSWORD", "development-cookie-secret");

    expect(getRateLimitSecret()).toBe("development-cookie-secret");
  });

  it("trusted app URL은 HTTPS origin만 허용한다", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://boardport.example");
    expect(getTrustedAppBaseUrl()).toBe("https://boardport.example");

    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://boardport.example/reset?token=x");
    expect(() => getTrustedAppBaseUrl()).toThrow("NEXT_PUBLIC_APP_URL");

    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://boardport.example");
    expect(() => getTrustedAppBaseUrl()).toThrow("NEXT_PUBLIC_APP_URL");
  });

  it("development에서 앱 URL이 없으면 localhost origin을 사용한다", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");

    expect(getTrustedAppBaseUrl()).toBe("http://localhost:3000");
  });
});
