/**
 * File Name : features/auth/service/sms.test.ts
 * Description : SMS 인증 토큰 TTL/쿨다운 정합성 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.27  임도헌   Created   SMS 만료/쿨다운/발송 실패 롤백 테스트 추가
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ERRORS } from "@/features/auth/constants";

const mocks = vi.hoisted(() => ({
  db: {
    sMSToken: {
      deleteMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      update: vi.fn(),
    },
  },
  sendSMS: vi.fn(),
  generateUniqueSmsToken: vi.fn(),
  checkAndRecordSmsSendAttemptByIp: vi.fn(),
}));

vi.mock("server-only", () => ({}));

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

describe("SMS verification service", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-27T00:00:00.000Z"));
    vi.clearAllMocks();

    mocks.db.sMSToken.deleteMany.mockResolvedValue({ count: 0 });
    mocks.db.sMSToken.create.mockResolvedValue({ id: 1 });
    mocks.db.sMSToken.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.sMSToken.delete.mockResolvedValue({ id: 1 });
    mocks.sendSMS.mockResolvedValue(undefined);
    mocks.generateUniqueSmsToken.mockResolvedValue("654321");
    mocks.checkAndRecordSmsSendAttemptByIp.mockResolvedValue({
      allowed: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("재전송 쿨다운 안에서는 새 SMS를 발송하지 않는다", async () => {
    const { createAndSendSmsToken } = await import("./sms");

    mocks.db.sMSToken.findUnique.mockResolvedValue({
      id: 1,
      token: "123456",
      phone: "01012345678",
      userId: 10,
      created_at: new Date("2026-06-27T00:00:00.000Z"),
      expires_at: new Date("2026-06-27T00:10:00.000Z"),
    });

    const result = await createAndSendSmsToken("01012345678");

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_RATE_LIMITED,
      code: "SMS_RATE_LIMITED",
    });
    expect(mocks.generateUniqueSmsToken).not.toHaveBeenCalled();
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("동시 재요청으로 발송 슬롯을 확보하지 못하면 SMS를 발송하지 않는다", async () => {
    const { createAndSendSmsToken } = await import("./sms");

    mocks.db.sMSToken.findUnique.mockResolvedValue({
      id: 1,
      token: "123456",
      phone: "01012345678",
      userId: 10,
      created_at: new Date("2026-06-26T23:58:00.000Z"),
      expires_at: new Date("2026-06-27T00:08:00.000Z"),
    });
    mocks.db.sMSToken.updateMany.mockResolvedValue({ count: 0 });

    const result = await createAndSendSmsToken("01012345678");

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_RATE_LIMITED,
      code: "SMS_RATE_LIMITED",
    });
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("IP 기준 SMS 발송 제한에 걸리면 새 토큰을 만들지 않는다", async () => {
    const { createAndSendSmsToken } = await import("./sms");

    mocks.db.sMSToken.findUnique.mockResolvedValue(null);
    mocks.checkAndRecordSmsSendAttemptByIp.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 120,
    });

    const result = await createAndSendSmsToken("01012345678", {
      clientIp: "203.0.113.10",
    });

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_RATE_LIMITED,
      code: "SMS_RATE_LIMITED",
    });
    expect(mocks.generateUniqueSmsToken).not.toHaveBeenCalled();
    expect(mocks.db.sMSToken.create).not.toHaveBeenCalled();
    expect(mocks.sendSMS).not.toHaveBeenCalled();
  });

  it("SMS 발송 실패 시 이전 유효 토큰을 복구한다", async () => {
    const { createAndSendSmsToken } = await import("./sms");

    const previous = {
      id: 1,
      token: "123456",
      phone: "01012345678",
      userId: 10,
      created_at: new Date("2026-06-26T23:58:00.000Z"),
      expires_at: new Date("2026-06-27T00:08:00.000Z"),
    };

    mocks.db.sMSToken.findUnique.mockResolvedValue(previous);
    mocks.sendSMS.mockRejectedValue(new Error("provider failed"));

    const result = await createAndSendSmsToken("01012345678");

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_SEND_FAILED,
      code: "SMS_SEND_FAILED",
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
        created_at: previous.created_at,
        expires_at: previous.expires_at,
      },
    });
  });

  it("최초 SMS 발송 실패 시 새로 만든 토큰을 정리한다", async () => {
    const { createAndSendSmsToken } = await import("./sms");

    mocks.db.sMSToken.findUnique.mockResolvedValue(null);
    mocks.sendSMS.mockRejectedValue(new Error("provider failed"));

    const result = await createAndSendSmsToken("01012345678");

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_SEND_FAILED,
      code: "SMS_SEND_FAILED",
    });
    expect(mocks.db.sMSToken.deleteMany).toHaveBeenLastCalledWith({
      where: { phone: "01012345678", token: "654321" },
    });
  });

  it("만료된 SMS 인증번호는 검증을 거부하고 정리한다", async () => {
    const { verifySmsToken } = await import("./sms");

    mocks.db.sMSToken.findUnique.mockResolvedValue({
      id: 1,
      userId: 10,
      phone: "01012345678",
      expires_at: new Date("2026-06-26T23:59:59.000Z"),
      user: {
        id: 10,
        bannedAt: null,
        bannedUntil: null,
      },
    });

    const result = await verifySmsToken("01012345678", "123456");

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_VERIFY_FAILED,
    });
    expect(mocks.db.sMSToken.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});
