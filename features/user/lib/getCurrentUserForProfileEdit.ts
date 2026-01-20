/**
 * File Name : features/user/lib/getCurrentUserForProfileEdit.ts
 * Description : 프로필 편집 화면용 현재 사용자 조회(폼에 필요한 필드만)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2024.11.25  임도헌   Created    app/(tabs)/profile/edit/actions 안 getUser 최초 구현
 * 2025.10.08  임도헌   Moved      actions → lib/user 로 분리(getCurrentUserForProfileEdit)
 * 2025.12.12  임도헌   Modified   needsPasswordSetup 조건 수정(이메일/비번 초기 세팅 필요 여부)
 * 2025.12.13  임도헌   Modified   호환 플래그 제거, needsEmailSetup/needsPasswordSetup 분리
 * 2026.01.19  임도헌   Moved     lib/user -> features/user/lib
 */

"use server";

import "server-only";
import db from "@/lib/db";
import getSession from "@/lib/session";

export type CurrentUserForProfileEdit = {
  id: number;
  username: string;
  email: string | null;
  avatar: string | null;
  phone: string | null;
  github_id: string | null;
  created_at: Date;
  updated_at: Date;
  emailVerified: boolean;

  /** 최초 세팅 필요 플래그 (클라이언트에 해시 미노출) */
  needsEmailSetup: boolean; // 소셜/SMS 연동 + email 미설정
  needsPasswordSetup: boolean; // 소셜/SMS 연동 + password 미설정
};

export async function getCurrentUserForProfileEdit(): Promise<CurrentUserForProfileEdit | null> {
  const session = await getSession();
  if (!session?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      username: true,
      email: true,
      avatar: true,
      phone: true,
      github_id: true,
      created_at: true,
      updated_at: true,
      emailVerified: true,
      password: true, // 플래그 계산용(응답에는 포함하지 않음)
    },
  });

  if (!user) return null;

  // 소셜/SMS로 가입된 계정인지(정체성)
  const isSocialLogin = !!user.github_id || !!user.phone;

  // 이메일/비번 세팅 필요 여부를 분리
  const needsEmailSetup = isSocialLogin && !user.email;
  const needsPasswordSetup = isSocialLogin && !user.password;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    phone: user.phone,
    github_id: user.github_id,
    created_at: user.created_at,
    updated_at: user.updated_at,
    emailVerified: user.emailVerified,
    needsEmailSetup,
    needsPasswordSetup,
  };
}
