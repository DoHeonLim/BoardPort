/**
 * File Name : features/auth/actions/register.ts
 * Description : 회원가입 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.04  임도헌   Created
 * 2024.10.04  임도헌   Modified  폼 제출 및 검증 기능 추가
 * 2024.10.06  임도헌   Modified  세션 추가 및 회원가입 기능 완성
 * 2025.05.30  임도헌   Modified  비즈니스 로직 분리
 * 2026.01.20  임도헌   Modified  선조회 제거, Service 에러 응답 처리, 세션 저장 위임
 * 2026.01.30  임도헌   Moved     app/(auth)/create-account/actions.ts -> features/auth/actions/register.ts
 */
"use server";

import { createAccountSchema } from "@/features/auth/schemas/register";
import { saveUserSession } from "@/features/auth/service/authSession";
import { createAccount } from "@/features/auth/service/register";
import type { ActionState } from "@/features/auth/types";

/**
 * 회원가입 폼 제출을 처리합니다.
 *
 * 1. Zod 스키마를 사용하여 입력값을 검증합니다.
 * 2. Service 계층을 호출하여 계정을 생성합니다.
 * 3. 생성된 유저 ID로 세션을 저장하여 자동 로그인 처리합니다.
 *
 * @param {any} _prevState - 이전 상태 (useFormState)
 * @param {FormData} formData - 폼 데이터
 * @returns {Promise<ActionState>} 처리 결과 (성공 여부 및 에러)
 */
export async function submitCreateAccount(
  _prevState: any,
  formData: FormData
): Promise<ActionState> {
  const data = {
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  // 1. 입력값 검증
  const parsed = await createAccountSchema.safeParseAsync(data);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 2. 계정 생성 (Service)
  const result = await createAccount(parsed.data);

  if (!result.success) {
    if (result.code === "USERNAME_TAKEN") {
      return { success: false, fieldErrors: { username: [result.error] } };
    }
    if (result.code === "EMAIL_TAKEN") {
      return { success: false, fieldErrors: { email: [result.error] } };
    }
    return { success: false, error: result.error };
  }

  // 3. 세션 저장
  await saveUserSession(result.data.userId);

  return { success: true };
}
