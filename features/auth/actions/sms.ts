/**
 * File Name : features/auth/actions/sms.ts
 * Description : SMS 인증 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.04  임도헌   Created
 * 2024.10.04  임도헌   Modified  폼 제출 및 검증 기능 추가
 * 2024.10.11  임도헌   Modified  인증 번호 검증 때 전화번호까지 검증
 * 2025.04.05  임도헌   Modified  twillo에서 CoolSMS로 변경
 * 2025.06.05  임도헌   Modified  비즈니스 로직 분리
 * 2025.06.07  임도헌   Modified  리디렉션 제거
 * 2025.12.07  임도헌   Modified  VERIFIED_SAILOR 뱃지 체크를 badgeChecks.onVerificationUpdate로 통일
 * 2025.12.12  임도헌   Modified  토큰 검증 시 Prisma where 조건 수정 및 에러 메시지 로직 개선
 * 2026.01.20  임도헌   Modified  Service 분리 및 로직 단순화
 * 2026.01.30  임도헌   Moved     app/(auth)/sms/actions.ts -> features/auth/actions/sms.ts
 */
"use server";

import { phoneSchema, tokenSchema } from "@/features/auth/schemas/sms";
import { saveUserSession } from "@/features/auth/service/authSession";
import {
  createAndSendSmsToken,
  verifySmsToken,
} from "@/features/auth/service/sms";
import { badgeChecks } from "@/features/user/service/badge";
import { AUTH_ERRORS } from "@/features/auth/constants";
import type { ActionState } from "@/features/auth/types";

/**
 * SMS 인증 번호 발송을 요청
 *
 * @param {FormData} formData - 전화번호 포함
 * @returns {Promise<ActionState>} 발송 성공 여부
 */
export async function sendPhoneToken(formData: FormData): Promise<ActionState> {
  const phone = formData.get("phone");

  const result = phoneSchema.safeParse(phone);
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }

  const serviceRes = await createAndSendSmsToken(result.data);
  if (!serviceRes.success) {
    return { success: false, error: serviceRes.error };
  }

  return { success: true };
}

/**
 * SMS 인증 번호를 검증하고 로그인 처리
 *
 * @param {FormData} formData - 전화번호 및 인증 토큰 포함
 * @returns {Promise<ActionState>} 검증 성공 여부
 */
export async function verifyPhoneToken(
  formData: FormData
): Promise<ActionState> {
  const tokenRaw = formData.get("token");
  const phoneRaw = formData.get("phone");

  const tokenResult = await tokenSchema.safeParseAsync(tokenRaw);
  const phoneResult = phoneSchema.safeParse(phoneRaw);

  if (!tokenResult.success || !phoneResult.success) {
    return { success: false, error: AUTH_ERRORS.INVALID_INPUT };
  }

  // 검증 Service 호출
  const serviceRes = await verifySmsToken(
    phoneResult.data,
    tokenResult.data.toString()
  );

  if (!serviceRes.success) {
    return { success: false, error: serviceRes.error };
  }

  // 세션 저장 및 뱃지 처리
  await saveUserSession(serviceRes.data.userId);
  void badgeChecks.onVerificationUpdate(serviceRes.data.userId);

  return { success: true };
}
