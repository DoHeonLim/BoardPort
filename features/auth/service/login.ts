/**
 * File Name : features/auth/service/login.ts
 * Description : 유저 로그인 검증 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  유저 로그인 함수 분리
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 * 2026.01.20  임도헌   Modified  선조회 제거, 쿼리 최적화, 주석 보강
 * 2026.01.21  임도헌   Moved     lib/login -> service/login
 * 2026.01.25  임도헌   Modified  주석 보강
 */

import "server-only";
import bcrypt from "bcrypt";
import { LoginSchema } from "@/features/auth/schemas/login";
import { AUTH_ERRORS } from "@/features/auth/constants";
import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";

/**
 * 이메일과 비밀번호를 검증하여 로그인 처리를 수행합니다.
 *
 * @param {LoginSchema} params - 이메일 및 비밀번호 객체
 * @returns {Promise<ServiceResult<{ userId: number }>>} 성공 시 userId 반환, 실패 시 에러 메시지
 */
export async function verifyLogin({
  email,
  password,
}: LoginSchema): Promise<ServiceResult<{ userId: number }>> {
  // 1. 이메일로 유저 조회 (비밀번호 해시 필요)
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, password: true },
  });

  // 2. 유저 존재 여부 및 비밀번호 설정 여부 확인 (소셜 로그인 전용 계정 방어)
  if (!user || !user.password) {
    return { success: false, error: AUTH_ERRORS.INVALID_CREDENTIALS };
  }

  // 3. 비밀번호 일치 여부 검증
  const isCorrect = await bcrypt.compare(password, user.password);
  if (!isCorrect) {
    return { success: false, error: AUTH_ERRORS.INVALID_CREDENTIALS };
  }

  return { success: true, data: { userId: user.id } };
}
