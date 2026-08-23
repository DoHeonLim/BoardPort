/**
 * File Name : features/auth/actions/sms.ts
 * Description : SMS 인증 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.04  임도헌   Created
 * 2024.10.04  임도헌   Modified  폼 제출 및 검증 기능 추가
 * 2024.10.11  임도헌   Modified  인증 번호 검증 때 전화번호까지 검증
 * 2025.04.05  임도헌   Modified  Twilio에서 CoolSMS로 변경
 * 2025.06.05  임도헌   Modified  비즈니스 로직 분리
 * 2025.06.07  임도헌   Modified  리디렉션 제거
 * 2025.12.07  임도헌   Modified  VERIFIED_SAILOR 뱃지 체크를 badgeChecks.onVerificationUpdate로 통일
 * 2025.12.12  임도헌   Modified  토큰 검증 시 Prisma where 조건 수정 및 에러 메시지 로직 개선
 * 2026.01.20  임도헌   Modified  Service 분리 및 로직 단순화
 * 2026.01.30  임도헌   Moved     app/(auth)/sms/actions.ts -> features/auth/actions/sms.ts
 * 2026.04.04  임도헌   Modified  전화번호/SMS 토큰 검증과 세션 저장 단계의 인라인 주석 보강
 * 2026.05.16  임도헌   Modified  현재 actions 계층 역할에 맞게 파일 설명 정리
 * 2026.06.27  임도헌   Modified  SMS 발송 시 IP hash 기반 발송 제한 컨텍스트 전달
 * 2026.08.23  임도헌   Modified  SMS 인증번호 검증에 IP·전화번호 실패 제한 적용
 */
"use server";

import { headers } from "next/headers";
import { phoneSchema, tokenSchema } from "@/features/auth/schemas/sms";
import { getClientIpFromHeaders } from "@/features/auth/service/rateLimit";
import { saveUserSession } from "@/features/auth/service/authSession";
import { resolvePostAuthRedirectPath } from "@/features/auth/service/onboarding";
import {
  createAndSendSmsToken,
  verifySmsToken,
} from "@/features/auth/service/sms";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { badgeChecks } from "@/features/user/service/badge";
import { AUTH_ERRORS } from "@/features/auth/constants";
import type { ActionState } from "@/features/auth/types";

/**
 * SMS 인증 번호 발송을 요청
 *
 * @param {FormData} formData - 전화번호 포함
 * @returns {Promise<ActionState<"phone">>} 발송 성공 여부
 */
export async function sendPhoneToken(
  formData: FormData
): Promise<ActionState<"phone">> {
  // 전화번호 원본 값 추출
  const phone = formData.get("phone");

  // 발송 전 전화번호 형식 검증
  const result = phoneSchema.safeParse(phone);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  // 인증번호 생성 및 문자 발송 위임
  const serviceRes = await createAndSendSmsToken(result.data, {
    clientIp: getClientIpFromHeaders(headers()),
  });
  if (!serviceRes.success) {
    return { success: false, error: serviceRes.error };
  }

  return { success: true };
}

/**
 * SMS 인증 번호를 검증하고 로그인 처리
 *
 * @param {FormData} formData - 전화번호 및 인증 토큰 포함
 * @returns {Promise<ActionState<"phone" | "token">>} 검증 성공 여부
 */
export async function verifyPhoneToken(
  formData: FormData
): Promise<ActionState<"phone" | "token">> {
  // 폼 원본 값 및 인증 후 복귀 문맥 추출
  const tokenRaw = formData.get("token");
  const phoneRaw = formData.get("phone");
  const callbackUrl = sanitizeCallbackUrl(
    formData.get("callbackUrl") ?? "/profile"
  );

  // 전화번호/인증번호 형식 검증
  const tokenResult = await tokenSchema.safeParseAsync(tokenRaw);
  const phoneResult = phoneSchema.safeParse(phoneRaw);

  if (!tokenResult.success || !phoneResult.success) {
    return { success: false, error: AUTH_ERRORS.INVALID_INPUT };
  }

  // 검증 Service 호출
  const clientIp = getClientIpFromHeaders(headers());
  const serviceRes = await verifySmsToken(
    phoneResult.data,
    tokenResult.data.toString(),
    { clientIp }
  );

  if (!serviceRes.success) {
    return { success: false, error: serviceRes.error };
  }

  // 인증 성공 후 세션 저장
  await saveUserSession(serviceRes.data.userId);

  // 인증 완료 뱃지 갱신 트리거
  void badgeChecks.onVerificationUpdate(serviceRes.data.userId);

  return {
    success: true,
    // 온보딩 필요 여부를 반영한 인증 후 목적지 결정
    redirectTo: await resolvePostAuthRedirectPath(serviceRes.data.userId, callbackUrl),
  };
}
