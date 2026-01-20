/**
 * File Name : features/auth/lib/sms/token.ts
 * Description : SMS 인증번호(6자리) 생성 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created   SMS 인증번호 랜덤 생성 + 중복 체크
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 */

import crypto from "crypto";
import db from "@/lib/db";

export async function generateUniqueToken(): Promise<string> {
  const token = crypto.randomInt(100000, 999999).toString();
  const exists = await db.sMSToken.findUnique({ where: { token } });

  // 혹시라도 토큰이 이미 존재하면 재귀 호출로 새 토큰 생성
  return exists ? generateUniqueToken() : token;
}
