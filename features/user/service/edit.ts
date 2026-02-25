/**
 * File Name : features/user/service/edit.ts
 * Description : 유저 정보 수정 서비스 (Profile, Password)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.11.25  임도헌   Created    app/(tabs)/profile/edit/actions 안 EditProfile 최초 구현
 * 2025.10.08  임도헌   Moved      actions → lib/profile/edit 로 분리(editProfile)
 * 2025.10.31  임도헌   Modified   P2002(Unique) 처리 + 필드 에러 반환 + 태그/경로 재검증
 * 2025.12.09  임도헌   Modified   profileEditFormSchema 옵션(needsPasswordSetup) 반영
 * 2025.12.13  임도헌   Modified   email은 최초 세팅(needsEmailSetup) 때만, phone은 인증 API에서만 변경
 * 2025.12.22  임도헌   Modified   Prisma 에러 가드 유틸로 변경
 * 2025.12.23  임도헌   Modified   P2002 meta.target(배열/문자열) 기반 필드 판별 안정화
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 * 2026.01.24  임도헌   Modified   editProfile, changePassword 로직 통합
 */

import "server-only";

import db from "@/lib/db";
import bcrypt from "bcrypt";
import { Prisma } from "@/generated/prisma/client";
import { isUniqueConstraintError } from "@/lib/errors";
import { USER_ERRORS } from "@/features/user/constants";
import type { ServiceResult } from "@/lib/types";
import type { CurrentUserForEdit } from "@/features/user/types";

/**
 * 프로필 편집용 현재 유저 정보 조회
 */
export async function getCurrentUserForEdit(
  userId: number
): Promise<CurrentUserForEdit | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      phone: true,
      github_id: true,
      kakao_id: true,
      created_at: true,
      updated_at: true,
      emailVerified: true,
      password: true, // 내부 계산용 (null 체크)
    },
  });

  if (!user) return null;

  // 소셜 로그인 여부 판단 (GitHub ID 또는 전화번호 존재)
  const isSocialLogin = !!user.github_id || !!user.kakao_id || !!user.phone;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    phone: user.phone,
    github_id: user.github_id,
    kakao_id: user.kakao_id,
    created_at: user.created_at,
    updated_at: user.updated_at,
    emailVerified: user.emailVerified,
    // 이메일/비밀번호 최초 설정 필요 여부 계산
    needsEmailSetup: isSocialLogin && !user.email,
    needsPasswordSetup: isSocialLogin && !user.password,
  };
}

/**
 * 프로필 업데이트
 */
export async function updateProfileService(
  userId: number,
  data: {
    username: string;
    email?: string | null;
    password?: string | null;
    avatar?: string | null;
  },
  options: {
    needsEmailSetup: boolean;
    needsPasswordSetup: boolean;
  }
): Promise<
  { success: true } | { success: false; field?: string; error: string }
> {
  // 1. username 정규화 (소문자 저장 + NFC)
  const usernameForDb = data.username.trim().toLowerCase().normalize("NFC");

  const updateData: Prisma.UserUpdateInput = {
    username: usernameForDb,
    avatar: data.avatar,
  };

  // 2. 조건부 업데이트 (이메일/비밀번호는 최초 설정 시에만 허용)
  if (options.needsEmailSetup && data.email) {
    updateData.email = data.email;
    updateData.emailVerified = false; // 이메일 변경 시 재인증 필요
  }

  if (options.needsPasswordSetup && data.password) {
    updateData.password = await bcrypt.hash(data.password, 12);
  }

  try {
    await db.user.update({
      where: { id: userId },
      data: updateData,
    });
    return { success: true };
  } catch (e) {
    // 3. 중복 에러 처리 (P2002)
    if (isUniqueConstraintError(e)) {
      // Username 중복 확인
      const takenUser = await db.user.findFirst({
        where: { username: usernameForDb, NOT: { id: userId } },
        select: { id: true },
      });
      if (takenUser)
        return {
          success: false,
          field: "username",
          error: USER_ERRORS.USERNAME_TAKEN,
        };

      // Email 중복 확인
      if (data.email) {
        const takenEmail = await db.user.findFirst({
          where: { email: data.email, NOT: { id: userId } },
          select: { id: true },
        });
        if (takenEmail)
          return {
            success: false,
            field: "email",
            error: USER_ERRORS.EMAIL_TAKEN,
          };
      }

      return { success: false, error: "이미 사용 중인 정보가 있습니다." };
    }

    console.error("[updateProfileService]", e);
    return { success: false, error: USER_ERRORS.SERVER_ERROR };
  }
}

/**
 * 비밀번호 변경
 */
export async function changePasswordService(
  userId: number,
  currentPw: string,
  newPw: string
): Promise<ServiceResult> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  // 소셜 로그인 전용 계정 등 비밀번호 미설정 계정 방어
  if (!user?.password) {
    return { success: false, error: "비밀번호 변경이 불가능한 계정입니다." };
  }

  // 1. 현재 비밀번호 검증
  const ok = await bcrypt.compare(currentPw, user.password);
  if (!ok) {
    return { success: false, error: USER_ERRORS.CURRENT_PASSWORD_WRONG };
  }

  // 2. 새 비밀번호 해싱 및 저장
  const hashed = await bcrypt.hash(newPw, 12);
  await db.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  return { success: true };
}
