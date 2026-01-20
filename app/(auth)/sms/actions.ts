/**
 * File Name : app/(auth)/sms/actions
 * Description : SMS 페이지 Form 제출 시
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.04  임도헌   Created
 * 2024.10.04  임도헌   Modified  폼 제출 및 검증 기능 추가
 * 2024.10.11  임도헌   Modified  인증 번호 검증 때 전화번호까지 검증
 * 2025.04.05  임도헌   Modified  twillo에서 CoolSMS로 변경
 * 2025.06.05  임도헌   Modified  비즈니스 로직 분리
 * 2025.06.07  임도헌   Modified  리디렉션 제거
 * 2025.12.07  임도헌   Modified  VERIFIED_SAILOR 뱃지 체크를 badgeChecks.onVerificationUpdate로 통일
 * 2025.12.12  임도헌   Modified  토큰 검증 시 Prisma where 조건 수정 및 에러 메시지 로직 개선
 */

"use server";

import db from "@/lib/db";
import crypto from "crypto";
import { sendSMS } from "@/features/auth/lib/sms/send";
import { badgeChecks } from "@/features/user/lib/badges";
import { phoneSchema, tokenSchema } from "@/features/auth/lib/sms/smsSchema";
import { generateUniqueToken } from "@/features/auth/lib/sms/token";
import { saveUserSession } from "@/features/auth/lib/saveUserSession";

export async function sendPhoneToken(formData: FormData) {
  const phone = formData.get("phone");

  const result = phoneSchema.safeParse(phone);
  if (!result.success) {
    return { error: result.error.errors[0].message };
  }

  const token = await generateUniqueToken();

  await db.sMSToken.deleteMany({
    where: { user: { phone: result.data } },
  });

  await db.sMSToken.create({
    data: {
      token,
      phone: result.data,
      user: {
        connectOrCreate: {
          where: { phone: result.data },
          create: {
            username: crypto.randomBytes(10).toString("hex"),
            phone: result.data,
          },
        },
      },
    },
  });

  try {
    await sendSMS(result.data, token);
  } catch (error) {
    console.error("SMS 전송 실패:", error);
    return {
      error: "SMS 전송에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return { success: true };
}

export async function verifyPhoneToken(formData: FormData) {
  const token = formData.get("token");
  const phone = formData.get("phone");

  const tokenResult = await tokenSchema.safeParseAsync(token);
  const phoneResult = phoneSchema.safeParse(phone);

  if (!tokenResult.success || !phoneResult.success) {
    return {
      error:
        tokenResult.error?.errors?.[0]?.message ??
        phoneResult.error?.errors?.[0]?.message ??
        "인증 실패",
    };
  }

  const tokenString = tokenResult.data.toString();

  // 토큰으로만 조회하고, DB에 저장된 phone과 비교
  const verifiedToken = await db.sMSToken.findUnique({
    where: {
      token: tokenString,
    },
    select: {
      id: true,
      userId: true,
      phone: true,
    },
  });

  if (!verifiedToken || verifiedToken.phone !== phoneResult.data) {
    return { error: "전화번호와 인증번호가 일치하지 않습니다." };
  }

  await db.sMSToken.delete({ where: { id: verifiedToken.id } });

  // 인증 기반 뱃지 체크(전화번호 인증)
  await badgeChecks.onVerificationUpdate(verifiedToken.userId);

  // 세션 저장
  await saveUserSession(verifiedToken.userId);

  return { success: true };
}
