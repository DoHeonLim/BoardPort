/**
 * File Name : features/user/actions/profile.ts
 * Description : 프로필/계정 관리 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   editProfile, changePassword 액션 통합 및 Service 연결
 * 2026.03.05  임도헌   Modified  프로필/위치 업데이트 시 발생하던 `revalidateTag` 파편화 제거 및 `revalidatePath` 기반 상태 동기화로 최적화
 * 2026.03.07  임도헌   Modified  비밀번호 변경 미로그인 오류를 전역 에러로 매핑
 * 2026.03.12  임도헌   Modified  프로필 이미지 애니메이션 메타(avatarAnimated) 저장 지원
 * 2026.03.21  임도헌   Modified  방송국 전용 소개글 저장을 채널 페이지 액션으로 분리
 * 2026.04.03  임도헌   Modified  프로필 정보 조회 액션과 위치 설정 액션 설명 보강
 */
"use server";

import { revalidatePath } from "next/cache";
import getSession from "@/lib/session";
import {
  getCurrentUserForEdit,
  updateProfileService,
  changePasswordService,
  updateChannelDescriptionService,
} from "@/features/user/service/edit";
import { updateUserLocation } from "@/features/user/service/profile";
import { getUserInfoById as getUserInfoService } from "@/features/user/service/profile";
import {
  profileEditSchema,
  passwordChangeSchema,
  channelDescriptionSchema,
} from "@/features/user/schemas";
import { USER_ERRORS } from "@/features/user/constants";
import type {
  EditProfileActionState,
  ChangePasswordActionState,
  ChannelDescriptionActionState,
} from "@/features/user/types";
import type { LocationData } from "@/features/map/types";

/**
 * 프로필 수정 Action
 */
export async function editProfileAction(
  formData: FormData
): Promise<EditProfileActionState> {
  // 세션 확인
  const session = await getSession();
  if (!session?.id) {
    return {
      success: false,
      errors: { formErrors: [USER_ERRORS.NOT_LOGGED_IN] },
    };
  }

  // 현재 유저 정보 조회
  // 소셜 로그인 여부와 초기 설정 상태에 따른 검증 분기 기준
  const current = await getCurrentUserForEdit(session.id);
  if (!current) {
    return { success: false, errors: { formErrors: [USER_ERRORS.NOT_FOUND] } };
  }

  // 입력 데이터 추출
  // 이메일/전화번호처럼 즉시 수정하지 않는 필드의 기본값 유지
  const data = {
    username: formData.get("username"),
    // 이메일은 최초 설정 시에만 변경 가능 (기존 이메일 유지)
    email: current.needsEmailSetup ? formData.get("email") : current.email,
    avatar: formData.get("avatar"),
    avatarAnimated: formData.get("avatarAnimated") === "true",
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    // 전화번호는 별도 인증 API로만 변경되므로 현재 값 유지
    phone: current.phone ?? null,
  };

  // 동적 스키마 생성 및 검증
  const schema = profileEditSchema({
    needsEmailSetup: current.needsEmailSetup,
    needsPasswordSetup: current.needsPasswordSetup,
    hasVerifiedPhone: !!current.phone,
  });

  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      success: false,
      errors: {
        formErrors: flat.formErrors,
        fieldErrors: flat.fieldErrors,
      },
    };
  }

  // 프로필 수정 service 위임
  const result = await updateProfileService(session.id, parsed.data, {
    needsEmailSetup: current.needsEmailSetup,
    needsPasswordSetup: current.needsPasswordSetup,
  });

  if (!result.success) {
    // 필드 에러와 전역 에러 분기
    if (result.field) {
      return {
        success: false,
        errors: { fieldErrors: { [result.field]: [result.error!] } },
      };
    }
    return { success: false, errors: { formErrors: [result.error!] } };
  }

  // 프로필/채널 화면 재검증
  revalidatePath("/profile");
  revalidatePath("/profile/edit");
  revalidatePath(`/profile/${current.username}/channel`);
  revalidatePath(`/profile/${parsed.data.username}/channel`);

  return { success: true };
}

/**
 * 방송국 소개 수정 Action
 */
export async function updateChannelDescriptionAction(
  formData: FormData
): Promise<ChannelDescriptionActionState> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: USER_ERRORS.NOT_LOGGED_IN };
  }

  const current = await getCurrentUserForEdit(session.id);
  if (!current) {
    return { success: false, error: USER_ERRORS.NOT_FOUND };
  }

  // 채널 소개 입력 검증
  const parsed = channelDescriptionSchema.safeParse({
    channelDescription: formData.get("channelDescription"),
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.flatten().fieldErrors.channelDescription?.[0] ??
        "채널 소개를 저장할 수 없습니다.",
    };
  }

  // 채널 소개 저장 service 위임
  const result = await updateChannelDescriptionService(
    session.id,
    parsed.data.channelDescription ?? null
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // 채널 화면 재검증
  revalidatePath(`/profile/${current.username}/channel`);

  return {
    success: true,
    value: parsed.data.channelDescription ?? null,
  };
}

/**
 * 비밀번호 변경 Action
 */
export async function changePasswordAction(
  formData: FormData
): Promise<ChangePasswordActionState> {
  const session = await getSession();
  if (!session?.id) {
    return {
      success: false,
      errors: { _: [USER_ERRORS.NOT_LOGGED_IN] },
    };
  }

  // 비밀번호 입력 수집
  const data = {
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  // 비밀번호 입력 검증
  const parsed = passwordChangeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  // 비밀번호 변경 service 위임
  const result = await changePasswordService(
    session.id,
    parsed.data.currentPassword,
    parsed.data.password
  );

  if (!result.success) {
    // 현재 비밀번호 불일치 분기
    if (result.error === USER_ERRORS.CURRENT_PASSWORD_WRONG) {
      return { success: false, errors: { currentPassword: [result.error] } };
    }
    return { success: false, errors: { _: [result.error!] } };
  }

  return { success: true };
}

/**
 * 유저 최소 정보를 다시 조회하는 액션
 */
export async function getUserInfoAction(userId: number) {
  return await getUserInfoService(userId);
}

/**
 * 유저 위치 설정 Action
 */
export async function updateUserLocationAction(
  location: Partial<LocationData>
) {
  const session = await getSession();
  if (!session?.id) return { success: false, error: USER_ERRORS.NOT_LOGGED_IN };

  // 위치 업데이트 service 위임
  const result = await updateUserLocation(session.id, location);

  if (result.success) {
    // 위치 기반 기본 필터 결과 재검증
    revalidatePath("/products");
    revalidatePath("/posts");
    revalidatePath("/profile");
  }

  return result;
}
