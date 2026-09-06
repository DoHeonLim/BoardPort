/**
 * File Name : features/auth/actions/login.test.ts
 * Description : 이메일 로그인 실패 제한 액션 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   IP·계정 bucket 차단과 성공 초기화 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ERRORS } from "@/features/auth/constants";

const mocks = vi.hoisted(() => ({
  verifyLogin: vi.fn(),
  saveUserSession: vi.fn(),
  resolveRedirect: vi.fn(),
  checkAttempt: vi.fn(),
  clearAttempts: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: () => new Headers() }));
vi.mock("@/features/auth/service/login", () => ({
  verifyLogin: mocks.verifyLogin,
}));
vi.mock("@/features/auth/service/authSession", () => ({
  saveUserSession: mocks.saveUserSession,
}));
vi.mock("@/features/auth/service/onboarding", () => ({
  resolvePostAuthRedirectPath: mocks.resolveRedirect,
}));
vi.mock("@/features/auth/service/rateLimit", () => ({
  getClientIpFromHeaders: () => "203.0.113.10",
  checkAndRecordLoginAttempt: mocks.checkAttempt,
  clearLoginAttempts: mocks.clearAttempts,
}));

function createFormData() {
  const formData = new FormData();
  formData.set("email", "USER@example.com");
  formData.set("password", "BoardPort!234");
  formData.set("callbackUrl", "/products");
  return formData;
}

describe("login action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkAttempt.mockResolvedValue({ allowed: true });
    mocks.verifyLogin.mockResolvedValue({ success: true, data: { userId: 7 } });
    mocks.resolveRedirect.mockResolvedValue("/products");
  });

  it("로그인 제한을 초과하면 계정 조회와 비밀번호 검증 전에 차단한다", async () => {
    mocks.checkAttempt.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 60,
    });
    const { login } = await import("./login");

    await expect(login(undefined, createFormData())).resolves.toEqual({
      success: false,
      error: AUTH_ERRORS.AUTH_RATE_LIMITED,
    });
    expect(mocks.verifyLogin).not.toHaveBeenCalled();
  });

  it("로그인 성공 시 실패 bucket을 초기화하고 최신 세션을 저장한다", async () => {
    const { login } = await import("./login");

    await expect(login(undefined, createFormData())).resolves.toEqual({
      success: true,
      redirectTo: "/products",
    });
    expect(mocks.clearAttempts).toHaveBeenCalledWith(
      "203.0.113.10",
      "user@example.com"
    );
    expect(mocks.saveUserSession).toHaveBeenCalledWith(7);
  });
});
