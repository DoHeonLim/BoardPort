/**
 * File Name : features/auth/service/sms.ts
 * Description : SMS 인증 관련 비즈니스 로직 (토큰 생성/발송/검증)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   SMS 관련 로직 Service 계층으로 분리(기존 코드는 app/(auth)/sms/actions에 있었음)
 * 2026.01.21  임도헌   Moved     lib/sms/service -> service/sms
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.08  임도헌   Modified  로그인 시 정지(Ban) 체크 및 만료 시 자동 해제 로직 추가
 * 2026.04.04  임도헌   Modified  SMS 토큰 발급/소모 단계의 인라인 주석 보강
 * 2026.06.27  임도헌   Modified  SMS 토큰 TTL, 재전송/IP 쿨다운, 발송 실패 롤백 처리 추가
 */

import "server-only";
import crypto from "crypto";
import { sendSMS } from "@/features/auth/utils/smsSender";
import { generateUniqueSmsToken } from "@/features/auth/service/token";
import { checkAndRecordSmsSendAttemptByIp } from "@/features/auth/service/rateLimit";
import {
  AUTH_ERRORS,
  SMS_VERIFY_RESEND_COOLDOWN_SECONDS,
  SMS_VERIFY_TOKEN_TTL_MS,
} from "@/features/auth/constants";
import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import type { ServiceResult } from "@/lib/types";

type SmsSendFailureCode = "SMS_SEND_FAILED" | "SMS_RATE_LIMITED";

/**
 * 전화번호로 인증 토큰 생성 및 SMS 발송을 수행
 * 기존 유효 토큰이 있다면 쿨다운을 확인하고, 발송 실패 시 이전 토큰 상태를 복구
 *
 * @param {string} phone - 검증된 전화번호 (하이픈 없는 숫자)
 * @param {{ clientIp?: string | null }} [options] - SMS IP rate limit 계산에 사용할 요청 컨텍스트
 * @returns {Promise<ServiceResult<void, SmsSendFailureCode>>} 성공 여부
 */
export async function createAndSendSmsToken(
  phone: string,
  options: { clientIp?: string | null } = {}
): Promise<ServiceResult<void, SmsSendFailureCode>> {
  const now = new Date();
  const cooldownCutoff = new Date(
    now.getTime() - SMS_VERIFY_RESEND_COOLDOWN_SECONDS * 1000
  );

  try {
    await db.sMSToken.deleteMany({
      where: { expires_at: { lt: now } },
    });

    const previousToken = await db.sMSToken.findUnique({
      where: { phone },
      select: {
        id: true,
        token: true,
        phone: true,
        userId: true,
        created_at: true,
        expires_at: true,
      },
    });

    if (previousToken && previousToken.created_at > cooldownCutoff) {
      return {
        success: false,
        error: AUTH_ERRORS.SMS_RATE_LIMITED,
        code: "SMS_RATE_LIMITED",
      };
    }

    const ipLimit = await checkAndRecordSmsSendAttemptByIp(
      options.clientIp ?? null
    );
    if (!ipLimit.allowed) {
      return {
        success: false,
        error: AUTH_ERRORS.SMS_RATE_LIMITED,
        code: "SMS_RATE_LIMITED",
      };
    }

    // 중복 없는 6자리 인증 토큰 생성
    const token = await generateUniqueSmsToken();
    const expiresAt = new Date(now.getTime() + SMS_VERIFY_TOKEN_TTL_MS);
    let createdNewToken = false;

    if (previousToken) {
      const updateResult = await db.sMSToken.updateMany({
        where: {
          id: previousToken.id,
          created_at: { lte: cooldownCutoff },
        },
        data: {
          token,
          phone,
          created_at: now,
          expires_at: expiresAt,
        },
      });

      if (updateResult.count === 0) {
        return {
          success: false,
          error: AUTH_ERRORS.SMS_RATE_LIMITED,
          code: "SMS_RATE_LIMITED",
        };
      }
    } else {
      // 토큰 저장 및 phone 기준 임시 계정 연결
      await db.sMSToken.create({
        data: {
          token,
          phone,
          expires_at: expiresAt,
          user: {
            connectOrCreate: {
              where: { phone },
              create: {
                username: `user_${crypto.randomBytes(4).toString("hex")}`,
                phone,
              },
            },
          },
        },
      });
      createdNewToken = true;
    }

    // 토큰 저장 후 실제 SMS 발송
    try {
      await sendSMS(phone, token);
    } catch (error) {
      if (previousToken) {
        await db.sMSToken.updateMany({
          where: {
            id: previousToken.id,
            token,
            created_at: now,
          },
          data: {
            token: previousToken.token,
            phone: previousToken.phone,
            created_at: previousToken.created_at,
            expires_at: previousToken.expires_at,
          },
        });
      } else if (createdNewToken) {
        await db.sMSToken.deleteMany({
          where: { phone, token },
        });
      }

      throw error;
    }

    return { success: true };
  } catch (error) {
    if (isUniqueConstraintError(error, ["phone"])) {
      return {
        success: false,
        error: AUTH_ERRORS.SMS_RATE_LIMITED,
        code: "SMS_RATE_LIMITED",
      };
    }

    console.error("SMS Send Error:", error);
    return {
      success: false,
      error: AUTH_ERRORS.SMS_SEND_FAILED,
      code: "SMS_SEND_FAILED",
    };
  }
}

/**
 * 인증 토큰을 검증하고 사용(삭제)
 *
 * @param {string} phone - 전화번호
 * @param {string} token - 사용자가 입력한 6자리 인증번호
 * @returns {Promise<ServiceResult<{ userId: number }>>} 성공 시 인증된 유저 ID 반환
 */
export async function verifySmsToken(
  phone: string,
  token: string
): Promise<ServiceResult<{ userId: number }>> {
  // 입력 토큰 기준의 저장 레코드 조회
  const verifiedToken = await db.sMSToken.findUnique({
    where: { token },
    select: {
      id: true,
      userId: true,
      phone: true,
      expires_at: true,
      user: {
        select: { id: true, bannedAt: true, bannedUntil: true },
      },
    },
  });

  // 존재 여부와 전화번호 일치 여부 검증
  if (!verifiedToken || verifiedToken.phone !== phone) {
    return { success: false, error: AUTH_ERRORS.SMS_VERIFY_FAILED };
  }

  if (verifiedToken.expires_at < new Date()) {
    await db.sMSToken.delete({ where: { id: verifiedToken.id } });
    return { success: false, error: AUTH_ERRORS.SMS_VERIFY_FAILED };
  }

  const user = verifiedToken.user;

  // 정지 상태 확인 및 만료 시 지연 해제
  if (user.bannedAt) {
    if (user.bannedUntil && new Date() > user.bannedUntil) {
      // 기간 만료 계정 자동 해제
      await db.user.update({
        where: { id: user.id },
        data: { bannedAt: null, bannedUntil: null },
      });
    } else {
      // 현재도 정지 중인 계정 차단
      return {
        success: false,
        error: "운영 정책에 의해 이용이 정지된 계정입니다.",
        code: "BANNED",
      };
    }
  }

  // 검증 성공 후 토큰 1회 소모
  await db.sMSToken.delete({ where: { id: verifiedToken.id } });

  return { success: true, data: { userId: verifiedToken.userId } };
}
