/**
 * File Name : features/auth/lib/email/token.ts
 * Description : 이메일 토큰 유틸 (발급/검증/매칭)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.04.13  임도헌   Created    최초 구현 (app/api/email/verify/actions 내 로컬 함수)
 * 2025.10.14  임도헌   Moved      app/api/email/verify/actions → lib/auth/email/token.ts 로 모듈 분리
 * 2025.10.14  임도헌   Modified   토큰 발급/존재검사/이메일-토큰 매칭 유틸로 분리 export,
 *                                 action 단에서 schema/로직이 재사용 가능하도록 설계
 * 2025.12.13  임도헌   Modified   "use server" 제거(server-only), 미사용 함수 제거, 범위 수정
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 */
import "server-only";
import crypto from "crypto";
import db from "@/lib/db";

/** 6자리 토큰 발급(중복 시 재귀 재발급) */
export async function handleGetToken(): Promise<string> {
  // crypto.randomInt는 상한이 "배타적"이라 1000000으로 두는 게 안전
  const token = crypto.randomInt(100000, 1000000).toString();

  const exists = await db.emailToken.findUnique({
    where: { token },
    select: { id: true },
  });

  if (exists) return handleGetToken();
  return token;
}
