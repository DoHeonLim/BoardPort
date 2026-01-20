/**
 * File Name : features/user/lib/getUserChannel.ts
 * Description : 채널(유저) 기본 정보 조회 (카운트 포함, 팔로우 여부는 별도)
 * Author : 임도헌
 *
 * History
 * 2025.09.19  임도헌   Created   채널 전용 경량 프로필(getUserChannel), 리다이렉트 제거
 * 2025.10.23  임도헌   Moved     app/(tabs)/profile/[username]/channel/actions → lib/user로 분리
 * 2026.01.19  임도헌   Moved     lib/user -> features/user/lib
 */
"use server";

import db from "@/lib/db";
import { notFound } from "next/navigation";
import { normalizeUsername } from "@/features/user/lib/normalizeUsername";

/** 채널 전용 경량 프로필 (카운트만 포함) */
export const getUserChannel = async (username: string) => {
  const uname = normalizeUsername(username);

  const user = await db.user.findUnique({
    where: { username: uname },
    select: {
      id: true,
      username: true,
      avatar: true,
      created_at: true,
      _count: { select: { followers: true, following: true } },
    },
  });

  if (!user) notFound();
  return user;
};
