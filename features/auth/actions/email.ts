/**
 * File Name : features/auth/actions/email.ts
 * Description : 이메일 인증 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.16  임도헌   Created   service/email.ts에서 클라이언트 호출용 서버 액션 분리
 * 2026.08.23  임도헌   Modified  이메일 인증 요청에 IP·이메일 제한 컨텍스트 전달
 */
"use server";

import { headers } from "next/headers";
import { handleEmailVerification } from "@/features/auth/service/email";
import type { EmailVerifyState } from "@/features/auth/types";
import { getClientIpFromHeaders } from "@/features/auth/service/rateLimit";

/**
 * 이메일 인증 폼 상태를 처리하는 클라이언트 호출용 서버 액션
 *
 * @param {EmailVerifyState} prevState - 이전 폼 상태
 * @param {FormData} formData - 폼 데이터
 * @returns {Promise<EmailVerifyState>} 인증 요청/검증 결과 상태
 */
export async function verifyEmail(
  prevState: EmailVerifyState,
  formData: FormData
): Promise<EmailVerifyState> {
  return handleEmailVerification(prevState, formData, {
    clientIp: getClientIpFromHeaders(await headers()),
  });
}
