/**
 * File Name : features/auth/actions/login.ts
 * Description : 로그인 Controller
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
 */
"use server";

import { verifyLogin } from "@/features/auth/service/login";
import { loginSchema } from "@/features/auth/schemas/login";
import { saveUserSession } from "@/features/auth/service/authSession";
import type { ActionState } from "@/features/auth/types";

/**
 * 로그인 폼 제출을 처리합니다.
 *
 * 1. 입력값을 검증합니다.
 * 2. Service 계층을 호출하여 이메일/비밀번호를 확인합니다.
 * 3. 검증 성공 시 세션을 생성합니다.
 *
 * @param {unknown} _prevState - 이전 상태
 * @param {FormData} formData - 폼 데이터
 * @returns {Promise<ActionState>} 처리 결과
 */
export async function login(
  _prevState: unknown,
  formData: FormData
): Promise<ActionState> {
  const data = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  // 1. 입력값 검증
  const parsed = await loginSchema.safeParseAsync(data);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 2. 로그인 검증 (Service)
  const result = await verifyLogin(parsed.data);

  if (!result.success) {
    return {
      success: false,
      fieldErrors: { password: [result.error] },
    };
  }

  // 3. 세션 저장
  await saveUserSession(result.data.userId);

  return { success: true };
}
