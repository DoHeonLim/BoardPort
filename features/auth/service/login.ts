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
 * 2026.02.07  임도헌   Modified  정지 유저 체크
 * 2026.02.08  임도헌   Modified  로그인 시 bannedUntil 체크 및 자동 해제(Lazy Unban) 로직 추가
 * 2026.04.04  임도헌   Modified  계정 조회/정지 분기/비밀번호 검증 단계의 인라인 주석 보강
 */

import "server-only";
import bcrypt from "bcrypt";
import { LoginSchema } from "@/features/auth/schemas/login";
import { AUTH_ERRORS } from "@/features/auth/constants";
import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";

/**
 * 이메일/비밀번호 로그인 검증 서비스
 *
 * - 유저의 정지 상태를 확인 하고
 *   이메일과 비밀번호를 검증하여 로그인 처리를 수행
 *
 * @param {LoginSchema} params - 이메일 및 비밀번호 객체
 * @returns {Promise<ServiceResult<{ userId: number }>>} 성공 시 userId 반환, 실패 시 에러 메시지
 */
export async function verifyLogin({
  email,
  password,
}: LoginSchema): Promise<ServiceResult<{ userId: number }>> {
  // 이메일 기준의 로그인 대상 계정 조회
  const user = await db.user.findUnique({
    where: { email },
    select: {
      id: true,
      password: true,
      bannedAt: true,
      bannedUntil: true,
      role: true,
    },
  });

  if (!user || !user.password) {
    return { success: false, error: AUTH_ERRORS.INVALID_CREDENTIALS };
  }

  // 이용 정지 상태 확인 및 만료 시 지연 해제
  if (user.bannedAt) {
    const now = new Date();

    // 기간제 정지 만료 계정 자동 해제
    if (user.bannedUntil && now > user.bannedUntil) {
      await db.user.update({
        where: { id: user.id },
        data: { bannedAt: null, bannedUntil: null },
      });
    } else {
      // 영구 정지 또는 현재도 기간이 남은 계정 차단
      let errorMsg = "운영 정책에 의해 이용이 정지된 계정입니다.";
      if (user.bannedUntil) {
        if (user.bannedUntil.getFullYear() >= 9999) {
          errorMsg = "운영 정책 위반으로 영구 정지된 계정입니다.";
        } else {
          errorMsg = `서비스 이용이 정지되었습니다.\n해제 일시: ${user.bannedUntil.toLocaleString()}`;
        }
      }

      return {
        success: false,
        error: errorMsg,
        code: "BANNED",
      };
    }
  }

  // 저장된 해시 기준의 비밀번호 검증
  const isCorrect = await bcrypt.compare(password, user.password);
  if (!isCorrect) {
    return { success: false, error: AUTH_ERRORS.INVALID_CREDENTIALS };
  }

  return { success: true, data: { userId: user.id } };
}
