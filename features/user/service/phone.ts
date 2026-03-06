/**
 * File Name : features/user/service/phone.ts
 * Description : 휴대폰 인증 서비스 (SMS 발송/검증)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.08  임도헌   Created    SMS 로그인 로직 재사용하여 프로필 수정용 검증 분리
 * 2025.10.08  임도헌   Modified   토큰 삭제, 휴대폰 중복(Unique) 처리, 뱃지 체크
 * 2025.12.07  임도헌   Modified   VERIFIED_SAILOR 뱃지 체크를 badgeChecks.onVerificationUpdate로 통일
 * 2025.12.22  임도헌   Modified   Prisma 에러 가드 유틸로 변경
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 * 2026.01.24  임도헌   Merged     lib/phone/*.ts 로직 이관
 * 2026.02.23  임도헌   Modified   토큰 검증 및 유저 업데이트 트랜잭션 적용
 * 2026.03.05  임도헌   Modified   휴대폰 인증 완료 시의 개인화 캐시 태그 무효화 로직 제거 및 `revalidatePath` 기반 단순화 적용
 * 2026.03.07  임도헌   Modified   인증 실패 문구를 구체화(v1.2)
 * 2026.03.07  임도헌   Modified   정지 유저 가드 및 SMS 발송 실패 롤백 보강
 */

import "server-only";
import { revalidatePath } from "next/cache";
import db from "@/lib/db";
import { sendSMS } from "@/features/auth/utils/smsSender";
import { generateUniqueSmsToken } from "@/features/auth/service/token";
import { badgeChecks } from "./badge";
import { isUniqueConstraintError } from "@/lib/errors";
import { validateUserStatus } from "@/features/user/service/admin";
import type { ServiceResult } from "@/lib/types";

/**
 * 프로필 인증용 SMS 발송
 */
export async function sendProfilePhoneTokenService(
  userId: number,
  phone: string
): Promise<ServiceResult> {
  const userStatus = await validateUserStatus(userId);
  if (!userStatus.success) {
    return { success: false, error: userStatus.error! };
  }

  // 1. 이미 사용 중인 번호인지 확인 (본인 제외)
  const taken = await db.user.findFirst({
    where: { phone, NOT: { id: userId } },
    select: { id: true },
  });
  if (taken) {
    return { success: false, error: "이미 사용 중인 전화번호입니다." };
  }

  // 2. 기존 토큰 정리 (해당 번호 또는 유저에게 발송된 미사용 토큰 삭제)
  await db.sMSToken.deleteMany({
    where: { OR: [{ phone }, { userId }] },
  });

  // 3. 새 토큰 생성 및 저장
  const token = await generateUniqueSmsToken();
  await db.sMSToken.create({
    data: { token, phone, userId },
  });

  // 4. SMS 발송
  try {
    await sendSMS(phone, token);
  } catch (error) {
    console.error("sendProfilePhoneTokenService error:", error);
    await db.sMSToken.deleteMany({
      where: { token, phone, userId },
    });
    return {
      success: false,
      error:
        "인증번호 발송에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  return { success: true };
}

/**
 * 프로필 인증번호 검증 및 전화번호 업데이트
 *
 * 트랜잭션을 적용하여 토큰 삭제와 유저 정보 갱신이 동시에 성공하거나,
 * 동시에 실패(롤백)하도록 보장
 */
export async function verifyProfilePhoneTokenService(
  userId: number,
  phone: string,
  token: string
): Promise<ServiceResult> {
  const userStatus = await validateUserStatus(userId);
  if (!userStatus.success) {
    return { success: false, error: userStatus.error! };
  }

  // 1. 토큰 조회 (번호, 토큰, 유저 일치 여부)
  const verified = await db.sMSToken.findFirst({
    where: { token, phone, userId },
    select: { id: true },
  });

  if (!verified) {
    return {
      success: false,
      error: "전화번호와 인증번호가 일치하지 않습니다.",
    };
  }

  try {
    // 2. 트랜잭션 실행 (토큰 소모 + 유저 정보 업데이트)
    await db.$transaction(async (tx) => {
      // (1) 토큰 삭제
      await tx.sMSToken.delete({ where: { id: verified.id } });

      // (2) 유저 업데이트
      await tx.user.update({
        where: { id: userId },
        data: { phone },
      });
    });
  } catch (e) {
    // Unique Constraint Error (이미 등록된 번호 등)
    if (isUniqueConstraintError(e, ["phone"])) {
      return {
        success: false,
        error: "이미 다른 계정에 등록된 전화번호입니다.",
      };
    }
    console.error("verifyProfilePhoneTokenService error:", e);
    return {
      success: false,
      error:
        "휴대폰 인증 처리에 실패했습니다. 인증번호를 다시 확인한 뒤 시도해주세요.",
    };
  }

  // 3. 뱃지 체크 및 캐시 갱신 (트랜잭션 외부)
  await badgeChecks.onVerificationUpdate(userId);

  // UI 갱신을 위해 관련 경로 리프레시
  revalidatePath("/profile");
  revalidatePath("/profile/edit");

  return { success: true };
}
