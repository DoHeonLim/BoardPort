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
 * 2026.04.04  임도헌   Modified  검증/에러 매핑/세션 저장 단계의 인라인 주석 보강
 */
"use server";

import {
  createAccountSchema,
  type CreateAccountSchema,
} from "@/features/auth/schemas/register";
import { saveUserSession } from "@/features/auth/service/authSession";
import { resolvePostAuthRedirectPath } from "@/features/auth/service/onboarding";
import { createAccount } from "@/features/auth/service/register";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import type { ActionState } from "@/features/auth/types";

/**
 * 회원가입 폼 제출을 처리
 *
 * 1. Zod 스키마를 사용하여 입력값을 검증
 * 2. Service 계층을 호출하여 계정을 생성
 * 3. 생성된 유저 ID로 세션을 저장하여 자동 로그인 처리
 *
 * @param {any} _prevState - 이전 상태 (useFormState)
 * @param {FormData} formData - 폼 데이터
 * @returns {Promise<ActionState<keyof CreateAccountSchema>>} 처리 결과 (성공 여부 및 에러)
 */
export async function submitCreateAccount(
  _prevState: any,
  formData: FormData
): Promise<ActionState<keyof CreateAccountSchema>> {
  // 폼 원본 값 수집
  const data = {
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  // 로그인 직후 복귀 문맥 정규화
  const callbackUrl = sanitizeCallbackUrl(
    formData.get("callbackUrl") ?? "/profile"
  );

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
    // 서비스 에러의 필드 단위 역매핑
    if (result.code === "USERNAME_TAKEN") {
      return { success: false, fieldErrors: { username: [result.error] } };
    }
    if (
      result.code === "EMAIL_TAKEN" ||
      result.code === "EMAIL_TAKEN_BY_SOCIAL"
    ) {
      return { success: false, fieldErrors: { email: [result.error] } };
    }
    return { success: false, error: result.error };
  }

  // 회원가입 직후 자동 로그인 처리
  await saveUserSession(result.data.userId);

  return {
    success: true,
    // 온보딩 필요 여부를 반영한 인증 후 목적지 결정
    redirectTo: await resolvePostAuthRedirectPath(result.data.userId, callbackUrl),
  };
}
