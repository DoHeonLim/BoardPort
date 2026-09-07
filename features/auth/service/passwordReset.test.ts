/**
 * File Name : features/auth/service/passwordReset.test.ts
 * Description : 비밀번호 재설정 세션 폐기 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   토큰 소비와 sessionVersion 증가의 원자적 처리 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  hash: vi.fn(),
  db: {
    $transaction: vi.fn(),
    passwordResetToken: {
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: { update: vi.fn() },
  },
}));

vi.mock("server-only", () => ({}));
vi.mock("bcrypt", () => ({ default: { hash: mocks.hash } }));
vi.mock("@/lib/db", () => ({ default: mocks.db }));
vi.mock("@/features/auth/utils/mailer", () => ({
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("@/features/auth/utils/emailDeliverability", () => ({
  validateDeliverableEmail: vi.fn(),
}));
vi.mock("@/features/auth/service/rateLimit", () => ({
  checkAndRecordPasswordResetRequest: vi.fn(),
}));

describe("resetPasswordWithTokenService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.db.passwordResetToken.findFirst.mockResolvedValue({
      id: "token-id",
      userId: 7,
    });
    mocks.db.passwordResetToken.deleteMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    mocks.db.user.update.mockResolvedValue({ id: 7 });
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.db)
    );
  });

  it("비밀번호 갱신과 함께 기존 세션 버전을 증가시킨다", async () => {
    const { resetPasswordWithTokenService } = await import("./passwordReset");

    await expect(
      resetPasswordWithTokenService("raw-token", "BoardPort!234")
    ).resolves.toEqual({ success: true });
    expect(mocks.db.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        password: "hashed-password",
        sessionVersion: { increment: 1 },
      },
    });
  });

  it("동시에 이미 소비된 토큰이면 비밀번호와 세션 버전을 바꾸지 않는다", async () => {
    mocks.db.passwordResetToken.deleteMany.mockReset();
    mocks.db.passwordResetToken.deleteMany.mockResolvedValue({ count: 0 });
    const { resetPasswordWithTokenService } = await import("./passwordReset");

    await expect(
      resetPasswordWithTokenService("raw-token", "BoardPort!234")
    ).resolves.toMatchObject({ success: false, code: "INVALID_RESET_TOKEN" });
    expect(mocks.db.user.update).not.toHaveBeenCalled();
  });
});
