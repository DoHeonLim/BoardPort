/**
 * File Name : features/auth/actions/passwordReset.ts
 * Description : 비밀번호 찾기/재설정 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   비밀번호 찾기 요청과 토큰 기반 비밀번호 재설정 액션 추가
 * 2026.03.14  임도헌   Modified  함수별 JSDoc 보강 및 에러 처리 흐름 정리
 * 2026.03.18  임도헌   Modified  비밀번호 찾기 요청 시 callbackUrl을 함께 전달해 재설정 후 재로그인 복귀 문맥 유지
 * 2026.08.23  임도헌   Modified  비밀번호 재설정 요청에 IP·이메일 제한 컨텍스트 전달
 */
"use server";

import { headers } from "next/headers";
import {
  passwordResetRequestSchema,
  passwordResetSchema,
  type PasswordResetRequestSchema,
  type PasswordResetSchema,
} from "@/features/auth/schemas/passwordReset";
import {
  requestPasswordResetService,
  resetPasswordWithTokenService,
} from "@/features/auth/service/passwordReset";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import type { ActionState } from "@/features/auth/types";
import { getClientIpFromHeaders } from "@/features/auth/service/rateLimit";

/**
 * 비밀번호 찾기 메일 요청 액션
 *
 * @param {unknown} _prevState - 이전 폼 상태
 * @param {FormData} formData - 이메일 입력 폼 데이터
 * @returns {Promise<ActionState<keyof PasswordResetRequestSchema>>} 메일 요청 성공/실패 결과
 */
export async function requestPasswordResetAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionState<keyof PasswordResetRequestSchema>> {
  const callbackUrl = sanitizeCallbackUrl(
    formData.get("callbackUrl") ?? "/profile"
  );
  const parsed = passwordResetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await requestPasswordResetService(parsed.data.email, callbackUrl, {
      clientIp: getClientIpFromHeaders(headers()),
    });
    return { success: true };
  } catch (error) {
    console.error("[requestPasswordResetAction]", error);
    return {
      success: false,
      error: "비밀번호 재설정 메일 요청에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }
}

/**
 * 토큰 기반 비밀번호 재설정 액션
 *
 * @param {unknown} _prevState - 이전 폼 상태
 * @param {FormData} formData - token/password/confirmPassword 폼 데이터
 * @returns {Promise<ActionState<keyof PasswordResetSchema>>} 재설정 성공/실패 결과
 */
export async function resetPasswordAction(
  _prevState: unknown,
  formData: FormData
): Promise<ActionState<keyof PasswordResetSchema>> {
  const parsed = passwordResetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await resetPasswordWithTokenService(
    parsed.data.token,
    parsed.data.password
  );

  if (!result.success) {
    return {
      success: false,
      error: result.error,
    };
  }

  return { success: true };
}
