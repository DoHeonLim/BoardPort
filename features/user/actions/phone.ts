/**
 * File Name : features/user/actions/phone.ts
 * Description : 휴대폰 인증 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   Action 정의
 */
"use server";

import getSession from "@/lib/session";
import { phoneSchema, tokenSchema } from "@/features/auth/schemas/sms";
import {
  sendProfilePhoneTokenService,
  verifyProfilePhoneTokenService,
} from "@/features/user/service/phone";
import { USER_ERRORS } from "@/features/user/constants";

/**
 * 프로필 인증용 SMS 발송 요청 Action
 */
export async function sendProfilePhoneTokenAction(formData: FormData) {
  const session = await getSession();
  if (!session?.id) return { success: false, error: USER_ERRORS.NOT_LOGGED_IN };

  // 1. 전화번호 형식 검증
  const parsed = phoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  // 2. Service 호출 (중복 확인 및 SMS 발송)
  return await sendProfilePhoneTokenService(session.id, parsed.data);
}

/**
 * 프로필 인증번호 검증 Action
 */
export async function verifyProfilePhoneTokenAction(formData: FormData) {
  const session = await getSession();
  if (!session?.id) return { success: false, error: USER_ERRORS.NOT_LOGGED_IN };

  // 1. 입력값 검증 (전화번호, 토큰)
  const phoneParsed = phoneSchema.safeParse(formData.get("phone"));
  const tokenParsed = await tokenSchema.safeParseAsync(formData.get("token"));

  if (!phoneParsed.success || !tokenParsed.success) {
    return { success: false, error: USER_ERRORS.INVALID_INPUT };
  }

  // 2. Service 호출 (검증 및 업데이트)
  return await verifyProfilePhoneTokenService(
    session.id,
    phoneParsed.data,
    tokenParsed.data.toString()
  );
}
