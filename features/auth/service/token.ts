/**
 * File Name : features/auth/service/token.ts
 * Description : 인증 토큰 생성 서비스 (Email & SMS) - 중복 체크 포함
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.04.13  임도헌   Created   최초 구현 (app/api/email/verify/actions 내 로컬 함수)
 * 2025.10.14  임도헌   Moved     app/api/email/verify/actions → lib/auth/email/token.ts 로 모듈 분리
 * 2025.10.14  임도헌   Modified  토큰 발급/존재검사/이메일-토큰 매칭 유틸로 분리 export,
 *                                action 단에서 schema/로직이 재사용 가능하도록 설계
 * 2025.12.13  임도헌   Modified  "use server" 제거(server-only), 미사용 함수 제거, 범위 수정
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 * 2026.01.21  임도헌   Moved     lib/email/token -> service/token
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Merged    features/auth/utils/tokenGenerator.ts (SMS) 통합
 */

import "server-only";
import crypto from "crypto";
import db from "@/lib/db";

/**
 * 6자리 숫자 인증 토큰을 생성합니다.
 * DB에서 중복 여부를 확인하고, 중복 시 재귀적으로 다시 생성하여 유니크함을 보장합니다.
 *
 * @returns {Promise<string>} 6자리 유니크 토큰 문자열
 */
export async function handleGetToken(): Promise<string> {
  // 1. 6자리 랜덤 숫자 생성 (100000 ~ 999999)
  // crypto.randomInt는 max가 배타적이므로 1000000으로 설정
  const token = crypto.randomInt(100000, 1000000).toString();

  // 2. 중복 체크
  const exists = await db.emailToken.findUnique({
    where: { token },
    select: { id: true },
  });

  // 3. 중복 시 재귀 호출, 아니면 반환
  if (exists) return handleGetToken();
  return token;
}

/**
 * 6자리 숫자 SMS 인증 토큰 생성
 * - SMSToken 테이블 중복 체크
 */
export async function generateUniqueSmsToken(): Promise<string> {
  const token = crypto.randomInt(100000, 999999).toString();

  const exists = await db.sMSToken.findUnique({
    where: { token },
    select: { id: true },
  });

  return exists ? generateUniqueSmsToken() : token;
}
