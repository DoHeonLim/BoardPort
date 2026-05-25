/**
 * File Name : features/auth/schemas.test.ts
 * Description : 인증/온보딩 폼 스키마 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   로그인/회원가입/온보딩/SMS/비밀번호 재설정 입력 검증 회귀 테스트 추가
 */

import { describe, expect, test } from "vitest";

import { loginSchema } from "@/features/auth/schemas/login";
import { onboardingSchema } from "@/features/auth/schemas/onboarding";
import {
  passwordResetFormSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
} from "@/features/auth/schemas/passwordReset";
import { createAccountSchema } from "@/features/auth/schemas/register";
import { phoneSchema, tokenSchema } from "@/features/auth/schemas/sms";

describe("auth schemas", () => {
  test("로그인 이메일은 trim과 소문자 정규화를 적용한다", () => {
    expect(
      loginSchema.parse({
        email: "  E2E.USER@BOARDPORT.TEST  ",
        password: "BoardPort!234",
      })
    ).toEqual({
      email: "e2e.user@boardport.test",
      password: "BoardPort!234",
    });
  });

  test("회원가입은 비밀번호 확인 불일치를 거부한다", () => {
    const result = createAccountSchema.safeParse({
      username: "tester",
      email: "tester@boardport.test",
      password: "BoardPort!234",
      confirmPassword: "BoardPort!999",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.confirmPassword).toContain(
        "비밀번호가 일치하지 않습니다."
      );
    }
  });

  test("온보딩은 필요한 계정 보완 항목만 강제한다", () => {
    const optionalOnly = onboardingSchema({
      needsUsernameSetup: false,
      needsLocationSetup: false,
    }).parse({
      username: "",
      email: "",
      latitude: "",
      longitude: "",
    });

    expect(optionalOnly.latitude).toBeUndefined();
    expect(optionalOnly.longitude).toBeUndefined();

    const requiredLocation = onboardingSchema({
      needsUsernameSetup: true,
      needsLocationSetup: true,
    }).safeParse({
      username: "ab",
      email: "bad-email",
      locationName: "",
      region1: "",
      region2: "",
      latitude: "",
      longitude: "",
    });

    expect(requiredLocation.success).toBe(false);
    if (!requiredLocation.success) {
      const fieldErrors = requiredLocation.error.flatten().fieldErrors;
      expect(fieldErrors.username).toContain(
        "유저명은 최소 3자 이상이어야 합니다."
      );
      expect(fieldErrors.email).toContain("이메일 형식을 확인해주세요.");
      expect(fieldErrors.locationName).toEqual(
        expect.arrayContaining([
          "활동 지역을 선택해주세요.",
          "활동 지역 정보를 다시 선택해주세요.",
          "활동 지역 좌표를 확인해주세요.",
        ])
      );
    }
  });

  test("SMS 전화번호와 인증번호 형식을 검증한다", () => {
    expect(phoneSchema.safeParse("01012345678").success).toBe(true);
    expect(phoneSchema.safeParse("02-123-4567").success).toBe(false);

    expect(tokenSchema.parse("123456")).toBe(123456);
    expect(tokenSchema.safeParse("12345").success).toBe(false);
  });

  test("비밀번호 재설정 스키마는 이메일, 토큰, 비밀번호 일치를 검증한다", () => {
    expect(
      passwordResetRequestSchema.parse({
        email: "  RESET@BOARDPORT.TEST  ",
      })
    ).toEqual({
      email: "reset@boardport.test",
    });

    expect(
      passwordResetSchema.safeParse({
        token: "",
        password: "BoardPort!234",
        confirmPassword: "BoardPort!234",
      }).success
    ).toBe(false);

    const formResult = passwordResetFormSchema.safeParse({
      password: "BoardPort!234",
      confirmPassword: "BoardPort!999",
    });

    expect(formResult.success).toBe(false);
    if (!formResult.success) {
      expect(formResult.error.flatten().fieldErrors.confirmPassword).toContain(
        "비밀번호가 일치하지 않습니다."
      );
    }
  });
});
