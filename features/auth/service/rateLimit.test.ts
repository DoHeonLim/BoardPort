/**
 * File Name : features/auth/service/rateLimit.test.ts
 * Description : 인증 rate limit 유틸 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.27  임도헌   Created   회원가입 IP hash 기반 단기 제출 제한 테스트 추가
 * 2026.06.27  임도헌   Modified  advisory lock 기반 원자적 기록 테스트 보강
 * 2026.08.23  임도헌   Modified  로그인 다중 bucket과 성공 초기화 검증 추가
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SIGNUP_RATE_LIMIT_MAX,
  SIGNUP_RATE_LIMIT_WINDOW_MS,
  SMS_SEND_IP_RATE_LIMIT_MAX,
  SMS_SEND_IP_RATE_LIMIT_WINDOW_MS,
} from "@/features/auth/constants";

const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
    authRateLimitEvent: {
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  default: mocks.db,
}));

describe("auth rate limit service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RATE_LIMIT_SALT", "rate-limit-secret");

    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.db)
    );
    mocks.db.$executeRaw.mockResolvedValue(0);
    mocks.db.authRateLimitEvent.deleteMany.mockResolvedValue({ count: 0 });
    mocks.db.authRateLimitEvent.findMany.mockResolvedValue([]);
    mocks.db.authRateLimitEvent.create.mockResolvedValue({ id: "event-id" });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("x-forwarded-for의 첫 번째 IP를 클라이언트 IP로 사용한다", async () => {
    const { getClientIpFromHeaders } = await import("./rateLimit");
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "203.0.113.20",
    });

    expect(getClientIpFromHeaders(headers)).toBe("203.0.113.10");
  });

  it("회원가입 제출 제한 여유가 있으면 hash만 저장하고 허용한다", async () => {
    const { checkAndRecordSignupAttemptByIp } = await import("./rateLimit");

    const result = await checkAndRecordSignupAttemptByIp(
      "203.0.113.10",
      new Date("2026-06-27T00:00:00.000Z")
    );

    expect(result).toEqual({ allowed: true });
    expect(mocks.db.$transaction).toHaveBeenCalledTimes(1);
    expect(mocks.db.$executeRaw).toHaveBeenCalledTimes(1);
    expect(mocks.db.authRateLimitEvent.create).toHaveBeenCalledWith({
      data: {
        kind: "signup-submit-ip",
        keyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        created_at: new Date("2026-06-27T00:00:00.000Z"),
      },
    });
    expect(mocks.db.authRateLimitEvent.create.mock.calls[0][0].data.keyHash).not
      .toBe("203.0.113.10");
  });

  it("회원가입 제출 제한을 초과하면 기록을 추가하지 않고 대기 시간을 반환한다", async () => {
    const { checkAndRecordSignupAttemptByIp } = await import("./rateLimit");
    const oldest = new Date("2026-06-27T00:00:30.000Z");

    mocks.db.authRateLimitEvent.findMany.mockResolvedValue(
      Array.from({ length: SIGNUP_RATE_LIMIT_MAX }, (_, index) => ({
        created_at: new Date(oldest.getTime() + index * 1000),
      }))
    );

    const result = await checkAndRecordSignupAttemptByIp(
      "203.0.113.10",
      new Date("2026-06-27T00:09:00.000Z")
    );

    expect(result).toEqual({
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (oldest.getTime() +
          SIGNUP_RATE_LIMIT_WINDOW_MS -
          new Date("2026-06-27T00:09:00.000Z").getTime()) /
          1000
      ),
    });
    expect(mocks.db.authRateLimitEvent.create).not.toHaveBeenCalled();
  });

  it("SMS 발송 IP 제한을 초과하면 기록을 추가하지 않고 대기 시간을 반환한다", async () => {
    const { checkAndRecordSmsSendAttemptByIp } = await import("./rateLimit");
    const oldest = new Date("2026-06-27T00:10:00.000Z");

    mocks.db.authRateLimitEvent.findMany.mockResolvedValue(
      Array.from({ length: SMS_SEND_IP_RATE_LIMIT_MAX }, (_, index) => ({
        created_at: new Date(oldest.getTime() + index * 1000),
      }))
    );

    const result = await checkAndRecordSmsSendAttemptByIp(
      "203.0.113.10",
      new Date("2026-06-27T00:55:00.000Z")
    );

    expect(result).toEqual({
      allowed: false,
      retryAfterSeconds: Math.ceil(
        (oldest.getTime() +
          SMS_SEND_IP_RATE_LIMIT_WINDOW_MS -
          new Date("2026-06-27T00:55:00.000Z").getTime()) /
          1000
      ),
    });
    expect(mocks.db.authRateLimitEvent.create).not.toHaveBeenCalled();
  });

  it("오래된 이벤트 정리 실패는 현재 요청을 막지 않는다", async () => {
    const { checkAndRecordSignupAttemptByIp } = await import("./rateLimit");

    mocks.db.authRateLimitEvent.deleteMany.mockRejectedValue(
      new Error("cleanup failed")
    );

    const result = await checkAndRecordSignupAttemptByIp("203.0.113.10");

    expect(result).toEqual({ allowed: true });
    expect(mocks.db.authRateLimitEvent.create).toHaveBeenCalled();
  });

  it("로그인은 IP와 정규화된 계정 bucket을 모두 기록한다", async () => {
    const { checkAndRecordLoginAttempt } = await import("./rateLimit");

    await expect(
      checkAndRecordLoginAttempt("203.0.113.10", "USER@example.com")
    ).resolves.toEqual({ allowed: true });
    expect(mocks.db.authRateLimitEvent.create).toHaveBeenCalledTimes(2);
    expect(
      mocks.db.authRateLimitEvent.create.mock.calls.map(
        ([input]) => input.data.kind
      )
    ).toEqual(["login-failure-ip", "login-failure-account"]);
  });

  it("로그인 성공 시 IP와 계정 실패 bucket을 모두 지운다", async () => {
    const { clearLoginAttempts } = await import("./rateLimit");

    await clearLoginAttempts("203.0.113.10", "USER@example.com");
    expect(mocks.db.authRateLimitEvent.deleteMany).toHaveBeenCalledTimes(2);
    expect(
      mocks.db.authRateLimitEvent.deleteMany.mock.calls.map(
        ([input]) => input.where.kind
      )
    ).toEqual(["login-failure-ip", "login-failure-account"]);
  });
});
