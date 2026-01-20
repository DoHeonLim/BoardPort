/**
 * File Name : features/user/lib/phone/sendProfilePhoneToken.ts
 * Description : 프로필 수정용 휴대폰 인증번호(SMS) 발송
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.08  임도헌   Created    SMS 로그인 로직 재사용하여 프로필 수정용 발송 분리
 * 2025.10.08  임도헌   Modified   동일 번호 기존 토큰 정리 및 세션 유저 연결
 * 2025.12.23  임도헌   Modified   다른 유저가 사용 중인 phone이면 발송 차단
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 */

"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { phoneSchema } from "@/features/auth/lib/sms/smsSchema";
import { generateUniqueToken } from "@/features/auth/lib/sms/token";
import { sendSMS } from "@/features/auth/lib/sms/send";

export async function sendProfilePhoneToken(formData: FormData) {
  const phone = formData.get("phone");

  const parsed = phoneSchema.safeParse(phone);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }
  const phoneValue = parsed.data;

  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 이미 다른 유저가 사용 중인 전화번호면 발송 차단
  const taken = await db.user.findFirst({
    where: {
      phone: phoneValue,
      NOT: { id: session.id },
    },
    select: { id: true },
  });

  if (taken) {
    return { success: false, error: "이미 사용 중인 전화번호입니다." };
  }

  // 기존 동일 전화번호/유저 연결 토큰 제거(중복 방지)
  await db.sMSToken.deleteMany({
    where: {
      OR: [{ phone: phoneValue }, { userId: session.id }],
    },
  });

  const token = await generateUniqueToken();

  // 프로필 수정용: 반드시 현재 로그인 유저와 연결
  await db.sMSToken.create({
    data: {
      token,
      phone: phoneValue,
      user: {
        connect: { id: session.id },
      },
    },
  });

  await sendSMS(phoneValue, token);

  return { success: true };
}
