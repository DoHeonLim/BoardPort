/**
 * File Name : features/user/actions/profile.ts
 * Description : 프로필/계정 관리 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   editProfile, changePassword 액션 통합 및 Service 연결
 */
"use server";

import { revalidateTag, revalidatePath } from "next/cache";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import {
  getCurrentUserForEdit,
  updateProfileService,
  changePasswordService,
} from "@/features/user/service/edit";
import { updateUserLocation } from "@/features/user/service/profile";
import { getUserInfoById as getUserInfoService } from "@/features/user/service/profile";
import {
  profileEditSchema,
  passwordChangeSchema,
} from "@/features/user/schemas";
import { normalizeUsername } from "@/features/user/utils/normalize";
import { USER_ERRORS } from "@/features/user/constants";
import type {
  EditProfileActionState,
  ChangePasswordActionState,
} from "@/features/user/types";
import type { LocationData } from "@/features/map/types";

/**
 * 프로필 수정 Action
 *
 * 1. 로그인 여부 확인
 * 2. 현재 유저 정보 조회 (소셜 로그인 여부 등 검증 옵션 결정)
 * 3. Zod 스키마 검증 (동적 옵션 적용)
 * 4. Service 호출 (DB 업데이트)
 * 5. 성공 시 관련 캐시 태그(코어, 뱃지, 닉네임) 및 경로 무효화
 */
export async function editProfileAction(
  formData: FormData
): Promise<EditProfileActionState> {
  // 1. 세션 확인
  const session = await getSession();
  if (!session?.id) {
    return {
      success: false,
      errors: { formErrors: [USER_ERRORS.NOT_LOGGED_IN] },
    };
  }

  // 2. 현재 유저 정보 조회 (검증 로직 분기용)
  const current = await getCurrentUserForEdit(session.id);
  if (!current) {
    return { success: false, errors: { formErrors: [USER_ERRORS.NOT_FOUND] } };
  }

  // 3. 입력 데이터 추출
  const data = {
    username: formData.get("username"),
    // 이메일은 최초 설정 시에만 변경 가능 (기존 이메일 유지)
    email: current.needsEmailSetup ? formData.get("email") : current.email,
    avatar: formData.get("avatar"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    // 전화번호는 별도 인증 API로만 변경되므로 현재 값 유지
    phone: current.phone ?? null,
  };

  // 4. 동적 스키마 생성 및 검증
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

  // 5. Service 호출 (업데이트)
  const result = await updateProfileService(session.id, parsed.data, {
    needsEmailSetup: current.needsEmailSetup,
    needsPasswordSetup: current.needsPasswordSetup,
  });

  if (!result.success) {
    // 필드 에러(중복 등)와 전역 에러 분기 처리
    if (result.field) {
      return {
        success: false,
        errors: { fieldErrors: { [result.field]: [result.error!] } },
      };
    }
    return { success: false, errors: { formErrors: [result.error!] } };
  }

  // 6. 캐시 무효화
  const oldUsernameKey = normalizeUsername(current.username);
  const newUsernameKey = normalizeUsername(parsed.data.username);

  revalidateTag(T.USER_CORE_ID(current.id));
  revalidateTag(T.USER_BADGES_ID(current.id)); // 아바타 변경 시 뱃지 UI 영향 가능성
  revalidateTag(T.USER_USERNAME_ID(oldUsernameKey)); // 구 닉네임 캐시 제거

  if (newUsernameKey !== oldUsernameKey) {
    revalidateTag(T.USER_USERNAME_ID(newUsernameKey)); // 신 닉네임 캐시 제거
  }

  revalidatePath("/profile");
  revalidatePath("/profile/edit");

  return { success: true };
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
      errors: { currentPassword: [USER_ERRORS.NOT_LOGGED_IN] },
    };
  }

  const data = {
    currentPassword: formData.get("currentPassword"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = passwordChangeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const result = await changePasswordService(
    session.id,
    parsed.data.currentPassword,
    parsed.data.password
  );

  if (!result.success) {
    // 현재 비밀번호 불일치 에러는 해당 필드에 표시
    if (result.error === USER_ERRORS.CURRENT_PASSWORD_WRONG) {
      return { success: false, errors: { currentPassword: [result.error] } };
    }
    return { success: false, errors: { _: [result.error!] } };
  }

  return { success: true };
}

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

  const result = await updateUserLocation(session.id, location);

  if (result.success) {
    // 유저 정보 갱신
    revalidateTag(T.USER_CORE_ID(session.id));

    // 리스트 페이지들의 디폴트 필터링 결과가 달라지므로 갱신
    revalidatePath("/products");
    revalidatePath("/posts");
    revalidatePath("/profile");
  }

  return result;
}
