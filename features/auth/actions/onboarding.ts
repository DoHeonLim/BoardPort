/**
 * File Name : features/auth/actions/onboarding.ts
 * Description : 인증 직후 최소 프로필/지역 설정 온보딩 Action
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   닉네임/이메일/지역 최소 보완 저장과 경로 리밸리데이션을 공통화
 * 2026.03.14  임도헌   Modified  이메일은 권장 보완으로 낮추고 지역/임시 닉네임만 강제 온보딩 대상으로 조정
 * 2026.03.25  임도헌   Modified  소셜 자동 생성 닉네임 보완은 hidden flag(forceUsernameSetup)로 현재 상태에 반영
 * 2026.04.02  임도헌   Modified  온보딩 액션 JSDoc 보강
 * 2026.04.04  임도헌   Modified  상태 재계산/동적 스키마/중복 역매핑 흐름의 인라인 주석 보강
 * 2026.07.31  임도헌   Modified  선택 이메일의 FormData null 처리와 저장값 정규화
 */
"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import getSession from "@/lib/session";
import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import {
  onboardingSchema,
  type OnboardingSchema,
} from "@/features/auth/schemas/onboarding";
import { getAuthOnboardingState } from "@/features/auth/service/onboarding";
import { normalizeOptionalEmail } from "@/features/auth/utils/email";
import type { ActionState } from "@/features/auth/types";

/**
 * 인증 직후 최소 프로필/지역 보완 저장 액션
 *
 * [동작]
 * - 현재 계정의 온보딩 필요 항목을 다시 계산해 이미 완료된 필드는 수정 대상에서 제외
 * - 동적 온보딩 스키마로 유저명, 선택 이메일, 활동 지역 입력값 검증
 * - 유저명/이메일 중복 충돌은 필드 에러로 변환해 폼에 직접 반환
 * - 저장 성공 후 프로필, 목록, 온보딩 경로를 재검증 가능하도록 관련 경로 리밸리데이션 수행
 *
 * @param {FormData} formData - 온보딩 폼 입력값과 강제 유저명 보완 플래그
 * @returns {Promise<ActionState<keyof OnboardingSchema>>} 저장 성공/실패 결과
 */
export async function completeOnboardingAction(
  formData: FormData
): Promise<ActionState<keyof OnboardingSchema>> {
  // 세션 존재 여부 확인
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  // 소셜 자동 생성 닉네임 보완 강제 여부 반영
  const forceUsernameSetup = formData.get("forceUsernameSetup") === "1";

  // 현재 계정 기준의 실제 온보딩 필요 상태 재계산
  const current = await getAuthOnboardingState(session.id, {
    forceUsernameSetup,
  });
  if (!current) {
    return { success: false, error: "사용자 정보를 찾을 수 없습니다." };
  }

  if (!current.needsOnboarding) {
    return { success: true };
  }

  // 아직 필요한 항목만 폼 값으로 덮고, 완료된 필드는 현재 값을 유지
  const data = {
    username: current.needsUsernameSetup
      ? formData.get("username")
      : current.username,
    email: current.needsEmailSetup
      ? (formData.get("email") ?? "")
      : current.email,
    locationName: current.needsLocationSetup
      ? formData.get("locationName")
      : current.locationName,
    region1: current.needsLocationSetup
      ? formData.get("region1")
      : current.region1,
    region2: current.needsLocationSetup
      ? formData.get("region2")
      : current.region2,
    region3: current.needsLocationSetup
      ? formData.get("region3")
      : current.region3,
    latitude: current.needsLocationSetup
      ? formData.get("latitude")
      : current.latitude,
    longitude: current.needsLocationSetup
      ? formData.get("longitude")
      : current.longitude,
  };

  // 강제 보완 대상에 맞춘 동적 스키마 구성
  const schema = onboardingSchema({
    needsUsernameSetup: current.needsUsernameSetup,
    needsLocationSetup: current.needsLocationSetup,
  });
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 저장 전 유저명 정규화
  const usernameForDb = current.needsUsernameSetup
    ? parsed.data.username!.trim().toLowerCase().normalize("NFC")
    : current.username;

  // 공통 업데이트 payload 시작점
  const updateData: Prisma.UserUpdateInput = {
    username: usernameForDb,
  };

  const normalizedEmail = normalizeOptionalEmail(parsed.data.email);

  // 선택 이메일 보완 시 검증 상태 초기화
  if (current.needsEmailSetup && normalizedEmail) {
    updateData.email = normalizedEmail;
    updateData.emailVerified = false;
  }

  // 지역 보완 시 최소 활동 반경까지 함께 저장
  if (current.needsLocationSetup) {
    updateData.locationName = parsed.data.locationName!.trim();
    updateData.region1 = parsed.data.region1!.trim();
    updateData.region2 = parsed.data.region2!.trim();
    updateData.region3 = parsed.data.region3?.trim() || null;
    updateData.latitude = parsed.data.latitude!;
    updateData.longitude = parsed.data.longitude!;
    updateData.regionRange = "GU";
  }

  try {
    await db.user.update({
      where: { id: session.id },
      data: updateData,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      // unique 제약 에러의 실제 충돌 필드 역추적
      const [takenUser, takenEmail] = await Promise.all([
        db.user.findFirst({
          where: { username: usernameForDb, NOT: { id: session.id } },
          select: { id: true },
        }),
        current.needsEmailSetup && normalizedEmail
          ? db.user.findFirst({
              where: {
                email: normalizedEmail,
                NOT: { id: session.id },
              },
              select: { id: true },
            })
          : Promise.resolve(null),
      ]);

      if (takenUser) {
        return {
          success: false,
          fieldErrors: { username: ["이미 사용 중인 유저명입니다."] },
        };
      }

      if (takenEmail) {
        return {
          success: false,
          fieldErrors: { email: ["이미 사용 중인 이메일입니다."] },
        };
      }
    }

    console.error("[completeOnboardingAction]", error);
    return {
      success: false,
      error: "온보딩 저장에 실패했습니다. 잠시 후 다시 시도해주세요.",
    };
  }

  // 온보딩 결과가 즉시 반영되어야 하는 경로 재검증
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath("/products");
  revalidatePath("/posts");
  revalidatePath("/onboarding");

  return { success: true };
}
