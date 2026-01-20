/**
 * File Name : features/user/lib/phone/verifyProfilePhoneToken.ts
 * Description : 프로필 수정용 휴대폰 인증번호 검증 → User.phone 업데이트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.08  임도헌   Created    SMS 로그인 로직 재사용하여 프로필 수정용 검증 분리
 * 2025.10.08  임도헌   Modified   토큰 삭제, 휴대폰 중복(Unique) 처리, 뱃지 체크
 * 2025.12.07  임도헌   Modified   VERIFIED_SAILOR 뱃지 체크를 badgeChecks.onVerificationUpdate로 통일
 * 2025.12.22  임도헌   Modified   Prisma 에러 가드 유틸로 변경
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 */

"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import { revalidatePath, revalidateTag } from "next/cache";
import { phoneSchema, tokenSchema } from "@/features/auth/lib/sms/smsSchema";
import { badgeChecks } from "@/features/user/lib/badges";
import { isUniqueConstraintError } from "@/lib/errors";

export async function verifyProfilePhoneToken(formData: FormData) {
  const tokenRaw = formData.get("token");
  const phoneRaw = formData.get("phone");

  const tokenResult = await tokenSchema.safeParseAsync(tokenRaw);
  const phoneResult = phoneSchema.safeParse(phoneRaw);

  if (!tokenResult.success || !phoneResult.success) {
    return {
      success: false,
      error:
        tokenResult.error?.errors?.[0]?.message ??
        phoneResult.error?.errors?.[0]?.message ??
        "인증에 실패했습니다.",
    };
  }

  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 현재 로그인 유저 + 전화번호 + 토큰 일치 검증
  const verified = await db.sMSToken.findFirst({
    where: {
      token: tokenResult.data.toString(),
      phone: phoneResult.data,
      userId: session.id,
    },
    select: { id: true, userId: true },
  });

  if (!verified) {
    return {
      success: false,
      error: "전화번호와 인증번호가 일치하지 않습니다.",
    };
  }

  // 토큰 즉시 제거(재사용 방지)
  await db.sMSToken.delete({ where: { id: verified.id } });

  // 전화번호 업데이트 시 Unique 제약 보호
  try {
    await db.user.update({
      where: { id: verified.userId },
      data: { phone: phoneResult.data },
    });
  } catch (e) {
    if (isUniqueConstraintError(e, ["phone"])) {
      return { success: false, error: "이미 등록된 전화번호입니다." };
    }
    console.error(e);
    return { success: false, error: "전화번호 저장 중 오류가 발생했습니다." };
  }

  // 인증 기반 뱃지 체크(전화번호 인증)
  await badgeChecks.onVerificationUpdate(verified.userId);

  revalidateTag(T.USER_CORE_ID(verified.userId));
  revalidateTag(T.USER_BADGES_ID(verified.userId));
  revalidatePath("/profile");
  revalidatePath("/profile/edit");

  return { success: true };
}
