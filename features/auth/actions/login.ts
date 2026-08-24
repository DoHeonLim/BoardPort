/**
 * File Name : features/auth/actions/login.ts
 * Description : 로그인 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.04  임도헌   Created
 * 2024.10.04  임도헌   Modified  폼 제출 및 검증 기능 추가
 * 2024.10.06  임도헌   Modified  로그인 기능 완성
 * 2025.05.30  임도헌   Modified  비즈니스 로직 분리
 * 2025.06.07  임도헌   Modified  리디렉션 제거
 * 2025.12.10  임도헌   Modified  로그인 액션 리턴 타입(success/fieldErrors) 구조화 및 예외 처리 준비
 * 2026.01.20  임도헌   Modified  로직 단순화 및 Service 호출로 통합, 주석 보강
 * 2026.01.30  임도헌   Moved     app/(auth)/login/actions.ts -> features/auth/actions/login.ts
 * 2026.03.07  임도헌   Modified  정지 계정 안내를 전역 에러로 분리하고 일반 인증 실패는 필드 에러로 유지
 * 2026.04.04  임도헌   Modified  검증/정지 분기/세션 저장 단계의 인라인 주석 보강
 * 2026.05.16  임도헌   Modified  현재 actions 계층 역할에 맞게 파일 설명 정리
 * 2026.08.23  임도헌   Modified  IP·계정 로그인 실패 제한과 성공 시 bucket 초기화 추가
 */
"use server";

import { headers } from "next/headers";
import { verifyLogin } from "@/features/auth/service/login";
import { loginSchema, type LoginSchema } from "@/features/auth/schemas/login";
import { saveUserSession } from "@/features/auth/service/authSession";
import { resolvePostAuthRedirectPath } from "@/features/auth/service/onboarding";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import type { ActionState } from "@/features/auth/types";
import { AUTH_ERRORS } from "@/features/auth/constants";
import {
  checkAndRecordLoginAttempt,
  clearLoginAttempts,
  getClientIpFromHeaders,
} from "@/features/auth/service/rateLimit";

/**
 * 로그인 폼 제출을 처리
 *
 * 1. 입력값을 검증
 * 2. Service 계층을 호출하여 이메일/비밀번호를 확인
 * 3. 검증 성공 시 세션을 생성
 *
 * @param {unknown} _prevState - 이전 상태
 * @param {FormData} formData - 폼 데이터
 * @returns {Promise<ActionState<keyof LoginSchema>>} 처리 결과
 */
export async function login(
  _prevState: unknown,
  formData: FormData
): Promise<ActionState<keyof LoginSchema>> {
  // 폼 원본 값 수집
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  // 인증 후 복귀 문맥 정규화
  const callbackUrl = sanitizeCallbackUrl(
    formData.get("callbackUrl") ?? "/profile"
  );

  // 1. 입력값 검증
  const parsed = await loginSchema.safeParseAsync(data);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const clientIp = getClientIpFromHeaders(await headers());
  const loginLimit = await checkAndRecordLoginAttempt(
    clientIp,
    parsed.data.email
  );
  if (!loginLimit.allowed) {
    return { success: false, error: AUTH_ERRORS.AUTH_RATE_LIMITED };
  }

  // 2. 로그인 검증 (Service)
  const result = await verifyLogin(parsed.data);

  if (!result.success) {
    // 정지 계정은 전역 안내 배너용 에러로 분리
    if (result.code === "BANNED") {
      return {
        success: false,
        error: result.error,
      };
    }

    // 일반 인증 실패는 비밀번호 필드 에러로 유지
    return {
      success: false,
      fieldErrors: { password: [result.error] },
    };
  }

  await clearLoginAttempts(clientIp, parsed.data.email);

  // 로그인 성공 후 세션 저장
  await saveUserSession(result.data.userId);

  return {
    success: true,
    // 온보딩 필요 여부를 반영한 인증 후 목적지 결정
    redirectTo: await resolvePostAuthRedirectPath(
      result.data.userId,
      callbackUrl
    ),
  };
}
