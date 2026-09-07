/**
 * File Name : features/auth/service/sms.test.ts
 * Description : SMS 인증 토큰 TTL/쿨다운 정합성 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.27  임도헌   Created   SMS 만료/쿨다운/발송 실패 롤백 테스트 추가
 * 2026.06.29  임도헌   Modified  SMS 인증 전 User.phone 점유, userId 잔존, 목적 혼용 방지 테스트 추가
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
      upsert: vi.fn(),
    },
  },
  sendSMS: vi.fn(),
  generateUniqueSmsToken: vi.fn(),
  checkAndRecordSmsSendAttemptByIp: vi.fn(),
  checkAndRecordSmsVerifyAttempt: vi.fn(),
  clearSmsVerifyAttempts: vi.fn(),
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
  checkAndRecordSmsVerifyAttempt: mocks.checkAndRecordSmsVerifyAttempt,
  clearSmsVerifyAttempts: mocks.clearSmsVerifyAttempts,
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
    mocks.db.user.upsert.mockResolvedValue({
      id: 10,
      phone: "01012345678",
      bannedAt: null,
      bannedUntil: null,
    });
    mocks.sendSMS.mockResolvedValue(undefined);
    mocks.generateUniqueSmsToken.mockResolvedValue("654321");
    mocks.checkAndRecordSmsSendAttemptByIp.mockResolvedValue({
      allowed: true,
    });
    mocks.checkAndRecordSmsVerifyAttempt.mockResolvedValue({ allowed: true });
    mocks.clearSmsVerifyAttempts.mockResolvedValue(undefined);
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

  it("최초 SMS 발송은 인증 전 User를 만들지 않고 토큰만 저장한다", async () => {
    const { createAndSendSmsToken } = await import("./sms");

    mocks.db.sMSToken.findUnique.mockResolvedValue(null);

    const result = await createAndSendSmsToken("01012345678");

    expect(result).toEqual({ success: true });
    expect(mocks.db.sMSToken.create).toHaveBeenCalledWith({
      data: {
        token: "654321",
        phone: "01012345678",
        expires_at: new Date("2026-06-27T00:10:00.000Z"),
      },
    });
    expect(mocks.db.user.upsert).not.toHaveBeenCalled();
  });

  it("기존 프로필 인증 토큰을 로그인 SMS로 갱신할 때 userId 연결을 끊는다", async () => {
    const { createAndSendSmsToken } = await import("./sms");

    mocks.db.sMSToken.findUnique.mockResolvedValue({
      id: 1,
      token: "123456",
      phone: "01012345678",
      userId: 10,
      created_at: new Date("2026-06-26T23:58:00.000Z"),
      expires_at: new Date("2026-06-27T00:08:00.000Z"),
    });

    const result = await createAndSendSmsToken("01012345678");

    expect(result).toEqual({ success: true });
    expect(mocks.db.sMSToken.updateMany).toHaveBeenCalledWith({
      where: {
        id: 1,
        created_at: { lte: new Date("2026-06-26T23:59:00.000Z") },
      },
      data: {
        token: "654321",
        phone: "01012345678",
        userId: null,
        created_at: new Date("2026-06-27T00:00:00.000Z"),
        expires_at: new Date("2026-06-27T00:10:00.000Z"),
      },
    });
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
        userId: previous.userId,
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

  it("SMS 인증 실패 제한을 초과하면 토큰 조회 전에 차단한다", async () => {
    const { verifySmsToken } = await import("./sms");
    mocks.checkAndRecordSmsVerifyAttempt.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 60,
    });

    const result = await verifySmsToken("01012345678", "123456", {
      clientIp: "203.0.113.10",
    });

    expect(result).toMatchObject({
      success: false,
      error: AUTH_ERRORS.AUTH_RATE_LIMITED,
      code: "RATE_LIMITED",
    });
    expect(mocks.db.sMSToken.findUnique).not.toHaveBeenCalled();
  });

  it("SMS 인증 성공 시 전화번호 기준 User를 찾거나 생성한 뒤 로그인 ID를 반환한다", async () => {
    const { verifySmsToken } = await import("./sms");

    mocks.db.sMSToken.findUnique.mockResolvedValue({
      id: 1,
      userId: null,
      phone: "01012345678",
      expires_at: new Date("2026-06-27T00:10:00.000Z"),
      user: null,
    });

    const result = await verifySmsToken("01012345678", "123456");

    expect(mocks.db.user.upsert).toHaveBeenCalledWith({
      where: { phone: "01012345678" },
      update: {},
      create: {
        username: expect.stringMatching(/^user_[0-9a-f]{8}$/),
        phone: "01012345678",
      },
      select: { id: true, phone: true, bannedAt: true, bannedUntil: true },
    });
    expect(mocks.db.sMSToken.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
    expect(result).toEqual({ success: true, data: { userId: 10 } });
    expect(mocks.clearSmsVerifyAttempts).toHaveBeenCalledWith(
      null,
      "01012345678"
    );
  });

  it("프로필 인증 토큰은 SMS 로그인 검증에서 소비하지 않는다", async () => {
    const { verifySmsToken } = await import("./sms");

    mocks.db.sMSToken.findUnique.mockResolvedValue({
      id: 1,
      userId: 20,
      phone: "01012345678",
      expires_at: new Date("2026-06-27T00:10:00.000Z"),
      user: {
        id: 20,
        phone: "01012345678",
        bannedAt: null,
        bannedUntil: null,
      },
    });

    const result = await verifySmsToken("01012345678", "123456");

    expect(result).toEqual({
      success: false,
      error: AUTH_ERRORS.SMS_VERIFY_FAILED,
    });
    expect(mocks.db.user.upsert).not.toHaveBeenCalled();
    expect(mocks.db.sMSToken.delete).not.toHaveBeenCalled();
  });
});
