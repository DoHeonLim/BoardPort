/**
 * File Name : features/user/service/phone.test.ts
 * Description : 프로필 휴대폰 인증 SMS 보호 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.27  임도헌   Created   프로필 SMS 쿨다운/IP 제한/발송 실패 롤백 테스트 추가
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ERRORS } from "@/features/auth/constants";

const mocks = vi.hoisted(() => ({
  db: {
    sMSToken: {
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  sendSMS: vi.fn(),
  generateUniqueSmsToken: vi.fn(),
  checkAndRecordSmsSendAttemptByIp: vi.fn(),
  validateUserStatus: vi.fn(),
  onVerificationUpdate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/db", () => ({
  default: mocks.db,
}));

vi.mock("@/features/auth/utils/smsSender", () => ({
  sendSMS: mocks.sendSMS,
}));

vi.mock("@/features/auth/service/token", () => ({
  generateUniqueSmsToken: mocks.generateUniqueSmsToken,
}));

vi.mock("@/features/auth/service/rateLimit", () => ({
  checkAndRecordSmsSendAttemptByIp: mocks.checkAndRecordSmsSendAttemptByIp,
}));

vi.mock("@/features/user/service/admin", () => ({
  validateUserStatus: mocks.validateUserStatus,
}));

vi.mock("./badge", () => ({
  badgeChecks: {
    onVerificationUpdate: mocks.onVerificationUpdate,
  },
}));

describe("profile phone verification service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T00:00:00.000Z"));
    vi.clearAllMocks();

    mocks.validateUserStatus.mockResolvedValue({ success: true });
    mocks.db.user.findFirst.mockResolvedValue(null);
    mocks.db.sMSToken.deleteMany.mockResolvedValue({ count: 0 });
    mocks.db.sMSToken.findFirst.mockResolvedValue(null);
    mocks.db.sMSToken.create.mockResolvedValue({ id: 1 });
    mocks.db.sMSToken.updateMany.mockResolvedValue({ count: 1 });
    mocks.sendSMS.mockResolvedValue(undefined);
    mocks.generateUniqueSmsToken.mockResolvedValue("654321");
    mocks.checkAndRecordSmsSendAttemptByIp.mockResolvedValue({
      allowed: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("재전송 쿨다운 안에서는 프로필 SMS를 발송하지 않는다", async () => {
    const { sendProfilePhoneTokenService } = await import("./phone");

    mocks.db.sMSToken.findFirst.mockResolvedValue({
      id: 1,
      token: "123456",
      phone: "01012345678",
      userId: 10,
      created_at: new Date("2026-06-27T00:00:00.000Z"),
      expires_at: new Date("2026-06-27T00:10:00.000Z"),
    });

    const result = await sendProfilePhoneTokenService(10, "01012345678");

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_RATE_LIMITED,
    });
    expect(mocks.generateUniqueSmsToken).not.toHaveBeenCalled();
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("IP 기준 SMS 발송 제한에 걸리면 프로필 토큰을 만들지 않는다", async () => {
    const { sendProfilePhoneTokenService } = await import("./phone");

    mocks.checkAndRecordSmsSendAttemptByIp.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 120,
    });

    const result = await sendProfilePhoneTokenService(10, "01012345678", {
      clientIp: "203.0.113.10",
    });

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_RATE_LIMITED,
    });
    expect(mocks.generateUniqueSmsToken).not.toHaveBeenCalled();
    expect(mocks.db.sMSToken.create).not.toHaveBeenCalled();
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("동시 재요청으로 프로필 SMS 발송 슬롯을 확보하지 못하면 발송하지 않는다", async () => {
    const { sendProfilePhoneTokenService } = await import("./phone");

    mocks.db.sMSToken.findFirst.mockResolvedValue({
      id: 1,
      token: "123456",
      phone: "01012345678",
      userId: 10,
      created_at: new Date("2026-06-26T23:58:00.000Z"),
      expires_at: new Date("2026-06-27T00:08:00.000Z"),
    });
    mocks.db.sMSToken.updateMany.mockResolvedValue({ count: 0 });

    const result = await sendProfilePhoneTokenService(10, "01012345678");

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_RATE_LIMITED,
    });
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("프로필 SMS 발송 실패 시 이전 유효 토큰을 복구한다", async () => {
    const { sendProfilePhoneTokenService } = await import("./phone");

    const previous = {
      id: 1,
      token: "123456",
      phone: "01012345678",
      userId: 10,
      created_at: new Date("2026-06-26T23:58:00.000Z"),
      expires_at: new Date("2026-06-27T00:08:00.000Z"),
    };

    mocks.db.sMSToken.findFirst.mockResolvedValue(previous);
    mocks.sendSMS.mockRejectedValue(new Error("provider failed"));

    const result = await sendProfilePhoneTokenService(10, "01012345678");

    expect(result).toEqual({
      success: false,
      error:
        "인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
    });
    expect(mocks.db.sMSToken.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: previous.id,
        token: "654321",
        created_at: new Date("2026-06-27T00:00:00.000Z"),
      },
      data: {
        token: previous.token,
        phone: previous.phone,
        userId: previous.userId,
        created_at: previous.created_at,
        expires_at: previous.expires_at,
      },
    });
  });
});
