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
 * 2026.03.15  임도헌   Modified  소셜 로그인으로 이미 연결된 이메일은 회원가입 전에 선조회로 분기해 안내 메시지 정교화
 * 2026.04.04  임도헌   Modified  이메일 선조회/중복 에러 역매핑 단계의 인라인 주석 보강
 */

import "server-only";
import bcrypt from "bcrypt";
import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import { CreateAccountSchema } from "@/features/auth/schemas/register";
import { AUTH_ERRORS } from "@/features/auth/constants";
import type { ServiceResult } from "@/lib/types";

/**
 * 신규 계정을 생성
 *
 * @param {CreateAccountSchema} data - 회원가입 폼 데이터 (username, email, password)
 * @returns {Promise<ServiceResult<{ userId: number }>>} 성공 시 생성된 userId 반환
 */
export async function createAccount(
  data: CreateAccountSchema
): Promise<ServiceResult<{ userId: number }>> {
  try {
    // 이메일 선조회 기반의 소셜 계정 충돌 분기
    const existingUserByEmail = await db.user.findUnique({
      where: { email: data.email },
      select: {
        id: true,
        password: true,
        kakao_id: true,
        github_id: true,
      },
    });

    if (existingUserByEmail) {
      // 비밀번호 없이 소셜 ID만 연결된 계정 여부 판별
      const isSocialOnlyAccount =
        !existingUserByEmail.password &&
        (!!existingUserByEmail.kakao_id || !!existingUserByEmail.github_id);

      return {
        success: false,
        error: isSocialOnlyAccount
          ? AUTH_ERRORS.EMAIL_TAKEN_BY_SOCIAL
          : AUTH_ERRORS.EMAIL_TAKEN,
        code: isSocialOnlyAccount ? "EMAIL_TAKEN_BY_SOCIAL" : "EMAIL_TAKEN",
      };
    }

    // 저장 전 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(data.password, 12);

    // 신규 로컬 계정 생성
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
    // unique 제약 에러의 필드 단위 역매핑
    if (isUniqueConstraintError(e, ["username"])) {
      return {
        success: false,
        error: AUTH_ERRORS.USERNAME_TAKEN,
        code: "USERNAME_TAKEN",
      };
    }
    if (isUniqueConstraintError(e, ["email"])) {
      // 경쟁 조건 구간에서도 소셜 계정 충돌 메시지 유지
      const existingUserByEmail = await db.user.findUnique({
        where: { email: data.email },
        select: {
          password: true,
          kakao_id: true,
          github_id: true,
        },
      });
      const isSocialOnlyAccount =
        !!existingUserByEmail &&
        !existingUserByEmail.password &&
        (!!existingUserByEmail.kakao_id || !!existingUserByEmail.github_id);

      return {
        success: false,
        error: isSocialOnlyAccount
          ? AUTH_ERRORS.EMAIL_TAKEN_BY_SOCIAL
          : AUTH_ERRORS.EMAIL_TAKEN,
        code: isSocialOnlyAccount ? "EMAIL_TAKEN_BY_SOCIAL" : "EMAIL_TAKEN",
      };
    }

    console.error("createAccount error:", e);
    return { success: false, error: AUTH_ERRORS.UNKNOWN_ERROR };
  }
}
