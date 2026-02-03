/**
 * File Name : features/auth/service/register.ts
 * Description : 유저 회원가입 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.30  임도헌   Created
 * 2025.05.30  임도헌   Modified  유저 회원가입 함수 분리
 * 2025.06.07  임도헌   Modified  saveUserSession 사용으로 변경
 * 2026.01.19  임도헌   Moved     lib/auth -> features/auth/lib
 * 2026.01.20  임도헌   Modified  세션 로직 분리, 에러 핸들링 표준화, 타입 적용
 * 2026.01.21  임도헌   Moved     lib/createAccount -> service/register
 * 2026.01.25  임도헌   Modified  주석 보강
 */

import "server-only";
import bcrypt from "bcrypt";
import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import { CreateAccountSchema } from "@/features/auth/schemas/register";
import { AUTH_ERRORS } from "@/features/auth/constants";
import type { ServiceResult } from "@/lib/types";

/**
 * 신규 계정을 생성합니다.
 *
 * @param {CreateAccountSchema} data - 회원가입 폼 데이터 (username, email, password)
 * @returns {Promise<ServiceResult<{ userId: number }>>} 성공 시 생성된 userId 반환
 */
export async function createAccount(
  data: CreateAccountSchema
): Promise<ServiceResult<{ userId: number }>> {
  try {
    // 1. 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // 2. 유저 DB 생성
    const user = await db.user.create({
      data: {
        username: data.username,
        email: data.email,
        password: hashedPassword,
      },
      select: { id: true },
    });

    return { success: true, data: { userId: user.id } };
  } catch (e) {
    // 3. 중복 에러 처리 (P2002)
    if (isUniqueConstraintError(e, ["username"])) {
      return {
        success: false,
        error: AUTH_ERRORS.USERNAME_TAKEN,
        code: "USERNAME_TAKEN",
      };
    }
    if (isUniqueConstraintError(e, ["email"])) {
      return {
        success: false,
        error: AUTH_ERRORS.EMAIL_TAKEN,
        code: "EMAIL_TAKEN",
      };
    }

    console.error("createAccount error:", e);
    return { success: false, error: AUTH_ERRORS.UNKNOWN_ERROR };
  }
}
