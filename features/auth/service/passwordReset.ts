/**
 * File Name : features/auth/service/passwordReset.ts
 * Description : 비밀번호 찾기/재설정 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   emailVerified 기반 비밀번호 재설정 요청/토큰 검증/비밀번호 갱신 서비스 추가
 * 2026.03.14  임도헌   Modified  재설정 토큰 해시 저장 및 메일 발송 실패 시 토큰 롤백 처리 추가
 * 2026.03.14  임도헌   Modified  메일 발송 전 테스트/예약 도메인 차단 및 MX 검사 적용
 * 2026.03.14  임도헌   Modified  재설정 토큰 1회 소비 원자성 및 메일 발송 성공 후 이전 토큰 정리 순서 보강
 * 2026.03.18  임도헌   Modified  로그인 가드에서 비밀번호 찾기로 이어질 때 원래 callbackUrl을 재설정 링크와 재로그인 복귀까지 유지
 * 2026.04.04  임도헌   Modified  비밀번호 재설정 토큰 발급/소비 단계의 인라인 주석 보강
 */

import "server-only";

import crypto from "crypto";
import bcrypt from "bcrypt";
import db from "@/lib/db";
import { sendPasswordResetEmail } from "@/features/auth/utils/mailer";
import { validateDeliverableEmail } from "@/features/auth/utils/emailDeliverability";
import {
  AUTH_ERRORS,
  PASSWORD_RESET_COOLDOWN_MS,
  PASSWORD_RESET_TTL_MS,
} from "@/features/auth/constants";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import type { ServiceResult } from "@/lib/types";

/**
 * 비밀번호 재설정 토큰 해시 생성
 *
 * @param {string} token - 메일 링크에 담길 원본 토큰
 * @returns {string} DB 저장/조회에 사용할 sha256 해시 문자열
 */
function hashPasswordResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * 비밀번호 재설정 링크 생성을 위한 앱 기본 URL 조회
 *
 * @returns {string} 비밀번호 재설정 링크 생성에 사용할 앱 기본 URL
 */
function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/**
 * 비밀번호 재설정 메일 요청 처리
 *
 * [Policy]
 * 1. emailVerified=true 계정만 비밀번호 찾기 지원
 * 2. 존재하지 않는 이메일/미인증 이메일은 모두 sent=false 처리로 계정 노출 최소화
 * 3. 같은 계정의 연속 요청은 3분 쿨다운 적용으로 메일 발송 낭비 방지
 * 4. 메일 발송 전 테스트/예약 도메인 차단 및 MX 검사 적용
 * 5. 재설정 토큰은 원문 대신 sha256 해시 저장
 * 6. 메일 발송 성공 후 이전 토큰 정리로 기존 유효 링크 보존
 * 7. 메일 발송 실패 시 방금 생성한 토큰 즉시 롤백
 *
 * @param {string} email - 비밀번호 재설정을 요청한 이메일 주소
 * @returns {Promise<ServiceResult<{ sent: boolean }>>} 메일 실제 발송 여부 포함 결과
 */
export async function requestPasswordResetService(
  email: string,
  callbackUrl: string = "/profile"
): Promise<ServiceResult<{ sent: boolean }>> {
  // 메일 발송과 링크 생성에 사용할 입력 정규화
  const normalizedEmail = email.trim().toLowerCase();
  const safeCallbackUrl = sanitizeCallbackUrl(callbackUrl);

  // 계정 존재 여부와 이메일 인증 상태 확인
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, emailVerified: true },
  });

  if (!user || !user.emailVerified) {
    return { success: true, data: { sent: false } };
  }

  // 테스트/예약 도메인 및 MX 유효성 차단
  const deliverabilityError = await validateDeliverableEmail(normalizedEmail);
  if (deliverabilityError) {
    return { success: true, data: { sent: false } };
  }

  // 동일 계정의 짧은 시간 내 반복 요청 차단
  const latest = await db.passwordResetToken.findFirst({
    where: {
      userId: user.id,
      created_at: {
        gte: new Date(Date.now() - PASSWORD_RESET_COOLDOWN_MS),
      },
    },
    orderBy: { created_at: "desc" },
    select: { id: true },
  });

  if (latest) {
    return { success: true, data: { sent: false } };
  }

  // 메일 링크 원문 토큰 생성 및 DB 저장용 해시 준비
  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = hashPasswordResetToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

  // 메일 발송 전 새 토큰 선저장
  const createdToken = await db.passwordResetToken.create({
    data: {
      token: hashedToken,
      expires_at: expiresAt,
      user: { connect: { id: user.id } },
    },
  });

  const resetUrl =
    `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}` +
    `&callbackUrl=${encodeURIComponent(safeCallbackUrl)}`;

  try {
    // 메일 발송 성공 후에만 기존 토큰 정리
    await sendPasswordResetEmail(normalizedEmail, resetUrl);
    await db.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        NOT: { id: createdToken.id },
      },
    });
  } catch (error) {
    // 메일 발송 실패 시 방금 만든 토큰 롤백
    await db.passwordResetToken.delete({ where: { id: createdToken.id } });
    throw error;
  }

  return { success: true, data: { sent: true } };
}

/**
 * 비밀번호 재설정 토큰 유효성 검증
 *
 * - 메일 링크 원문 토큰을 sha256 해시로 변환한 뒤 DB와 비교
 * - 실제 토큰 소비는 resetPasswordWithTokenService 에서만 수행
 *
 * @param {string} token - 재설정 링크에서 전달된 원문 토큰
 * @returns {Promise<ServiceResult<{ userId: number }>>} 유효한 경우 대상 userId 포함 결과
 */
export async function validatePasswordResetToken(
  token: string
): Promise<ServiceResult<{ userId: number }>> {
  // 링크 원문 토큰을 DB 조회용 해시로 변환
  const hashedToken = hashPasswordResetToken(token);
  const tokenRow = await db.passwordResetToken.findFirst({
    where: {
      token: hashedToken,
      expires_at: { gte: new Date() },
    },
    select: { id: true, userId: true },
  });

  if (!tokenRow) {
    return {
      success: false,
      error: "재설정 링크가 만료되었거나 유효하지 않습니다.",
      code: "INVALID_RESET_TOKEN",
    };
  }

  return { success: true, data: { userId: tokenRow.userId } };
}

/**
 * 재설정 토큰 기반 비밀번호 갱신
 *
 * - 메일 링크 원문 토큰을 sha256 해시로 변환한 뒤 DB와 비교
 * - 토큰 삭제와 비밀번호 갱신을 같은 트랜잭션에서 처리하여 1회 소비 원자성 보장
 * - 거의 동시에 같은 링크가 두 번 들어와도 deleteMany count=1 인 요청만 성공
 *
 * @param {string} token - 재설정 링크에서 전달된 원문 토큰
 * @param {string} password - 새로 저장할 비밀번호 평문
 * @returns {Promise<ServiceResult>} 비밀번호 갱신 성공/실패 결과
 */
export async function resetPasswordWithTokenService(
  token: string,
  password: string
): Promise<ServiceResult> {
  // 아직 만료되지 않은 토큰 선조회
  const hashedToken = hashPasswordResetToken(token);
  const tokenRow = await db.passwordResetToken.findFirst({
    where: {
      token: hashedToken,
      expires_at: { gte: new Date() },
    },
    select: { id: true, userId: true },
  });

  if (!tokenRow) {
    return {
      success: false,
      error: "재설정 링크가 만료되었거나 유효하지 않습니다.",
      code: "INVALID_RESET_TOKEN",
    };
  }

  // 사용자 비밀번호 해시 생성
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    const now = new Date();

    // 토큰 소비와 비밀번호 갱신의 같은 트랜잭션 처리
    const result = await db.$transaction(async (tx) => {
      // 유효성 확인과 소비 분리 시 같은 토큰의 거의 동시 이중 사용 가능성
      // 따라서 조건부 deleteMany로 "아직 만료되지 않은 이 토큰"을 먼저 소비하고,
      // count=1 인 요청만 비밀번호 갱신까지 진행
      const consumed = await tx.passwordResetToken.deleteMany({
        where: {
          token: hashedToken,
          expires_at: { gte: now },
        },
      });

      if (consumed.count !== 1) {
        return { consumed: false as const };
      }

      await tx.user.update({
        where: { id: tokenRow.userId },
        data: { password: hashedPassword },
      });

      await tx.passwordResetToken.deleteMany({
        where: { userId: tokenRow.userId },
      });

      return { consumed: true as const };
    });

    if (!result.consumed) {
      return {
        success: false,
        error: "재설정 링크가 만료되었거나 유효하지 않습니다.",
        code: "INVALID_RESET_TOKEN",
      };
    }
  } catch (error) {
    console.error("[resetPasswordWithTokenService]", error);
    return { success: false, error: AUTH_ERRORS.UNKNOWN_ERROR };
  }

  return { success: true };
}
