/**
 * File Name : features/stream/actions/access.test.ts
 * Description : PRIVATE 방송 잠금 해제 rate limit 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   IP·방송 실패 제한과 성공 bucket 초기화 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  verifyBroadcastPassword: vi.fn(),
  checkAttempt: vi.fn(),
  clearAttempts: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("next/headers", () => ({
  headers: () => new Headers({ "x-forwarded-for": "203.0.113.10" }),
}));
vi.mock("@/features/stream/service/access", () => ({
  verifyBroadcastPassword: mocks.verifyBroadcastPassword,
}));
vi.mock("@/features/auth/service/rateLimit", () => ({
  getClientIpFromHeaders: () => "203.0.113.10",
  checkAndRecordPrivateStreamPasswordAttempt: mocks.checkAttempt,
  clearPrivateStreamPasswordAttempts: mocks.clearAttempts,
}));

describe("unlockPrivateBroadcastAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({
      id: 7,
      unlockedBroadcastIds: {},
      save: mocks.save,
    });
    mocks.checkAttempt.mockResolvedValue({ allowed: true });
    mocks.verifyBroadcastPassword.mockResolvedValue({ success: true });
  });

  it("제한을 초과하면 bcrypt 검증 전에 차단한다", async () => {
    mocks.checkAttempt.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 60,
    });
    const { unlockPrivateBroadcastAction } = await import("./access");

    await expect(unlockPrivateBroadcastAction(12, "secret")).resolves.toEqual({
      success: false,
      error: "RATE_LIMITED",
    });
    expect(mocks.verifyBroadcastPassword).not.toHaveBeenCalled();
  });

  it("검증 성공 시 실패 bucket을 지우고 세션에 방송 ID를 저장한다", async () => {
    const session = await mocks.getSession();
    const { unlockPrivateBroadcastAction } = await import("./access");

    await expect(unlockPrivateBroadcastAction(12, "secret")).resolves.toEqual({
      success: true,
    });
    expect(mocks.clearAttempts).toHaveBeenCalledWith("203.0.113.10", 12);
    expect(session.unlockedBroadcastIds).toEqual({ "12": true });
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
});
