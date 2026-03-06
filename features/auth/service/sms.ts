/**
 * File Name : features/auth/sms/service.ts
 * Description : SMS 인증 관련 비즈니스 로직 (토큰 생성/발송/검증)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   SMS 관련 로직 Service 계층으로 분리(기존 코드는 app/(auth)/sms/actions에 있었음)
 * 2026.01.21  임도헌   Moved     lib/sms/service -> service/sms
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.08  임도헌   Modified  로그인 시 정지(Ban) 체크 및 만료 시 자동 해제 로직 추가
 */

import "server-only";
import crypto from "crypto";
import { sendSMS } from "@/features/auth/utils/smsSender";
import { generateUniqueSmsToken } from "@/features/auth/service/token";
import { AUTH_ERRORS } from "@/features/auth/constants";
import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";

/**
 * 전화번호로 인증 토큰 생성 및 SMS 발송을 수행
 * 기존 토큰이 있다면 삭제하고 새로 생성
 *
 * @param {string} phone - 검증된 전화번호 (하이픈 없는 숫자)
 * @returns {Promise<ServiceResult>} 성공 여부
 */
export async function createAndSendSmsToken(
  phone: string
): Promise<ServiceResult<void>> {
  try {
    // 1. 6자리 랜덤 토큰 생성
    const token = await generateUniqueSmsToken();

    // 2. 기존 토큰 정리 (중복 요청 방지)
    await db.sMSToken.deleteMany({
      where: { user: { phone } },
    });

    // 3. 토큰 저장 및 유저 연결 (없으면 임시 계정 생성)
    await db.sMSToken.create({
      data: {
        token,
        phone,
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

    // 4. SMS 발송
    await sendSMS(phone, token);

    return { success: true };
  } catch (error) {
    console.error("SMS Send Error:", error);
    return { success: false, error: AUTH_ERRORS.SMS_SEND_FAILED };
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
  // 1. 토큰 조회
  const verifiedToken = await db.sMSToken.findUnique({
    where: { token },
    select: {
      id: true,
      userId: true,
      phone: true,
      user: {
        select: { id: true, bannedAt: true, bannedUntil: true },
      },
    },
  });

  // 2. 토큰 유효성 검사 (존재 여부 및 전화번호 일치)
  if (!verifiedToken || verifiedToken.phone !== phone) {
    return { success: false, error: AUTH_ERRORS.SMS_VERIFY_FAILED };
  }

  const user = verifiedToken.user;

  // 3. 정지 유저 체크 및 Lazy Unban
  if (user.bannedAt) {
    if (user.bannedUntil && new Date() > user.bannedUntil) {
      // 기간 만료 -> 해제
      await db.user.update({
        where: { id: user.id },
        data: { bannedAt: null, bannedUntil: null },
      });
    } else {
      // 정지 중
      return {
        success: false,
        error: "운영 정책에 의해 이용이 정지된 계정입니다.",
        code: "BANNED",
      };
    }
  }

  // 4. 토큰 소모
  await db.sMSToken.delete({ where: { id: verifiedToken.id } });

  return { success: true, data: { userId: verifiedToken.userId } };
}
