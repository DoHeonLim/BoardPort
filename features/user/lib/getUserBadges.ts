/**
 * File Name : features/user/lib/getUserBadges.ts
 * Description : 전체 배지 및 유저 보유 배지 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/actions → lib/user로 분리
 * 2025.10.07  임도헌   Modified   반환 타입(Badge[]) 추가
 * 2025.10.23  임도헌   Modified   태그 네이밍 표준화와 wrapper 일관 적용
 * 2025.10.29  임도헌   Modified   nextCache 인자 간소화, 템플릿 리터럴 오류 수정, 주석 보강
 * 2026.01.19  임도헌   Moved     lib/user -> features/user/lib
 */

"use server";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import type { Badge } from "@/types/profile";

/**
 * revalidateTag 트리거 메모
 * - 전역 배지 추가/수정:
 *   revalidateTag("badges-all");
 * - 유저 배지 변경(획득/회수):
 *   revalidateTag(`user-badges-id-${userId}`);
 */

/** 전역 배지 목록 (최소 필드만) */
export const getAllBadges = async (): Promise<Badge[]> => {
  return db.badge.findMany({
    select: { id: true, name: true, icon: true, description: true },
    orderBy: { id: "asc" },
  });
};

/** 특정 유저가 보유한 배지 (User—Badge M:N) */
export const getUserBadges = async (userId: number): Promise<Badge[]> => {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      badges: {
        select: { id: true, name: true, icon: true, description: true },
        orderBy: { id: "asc" },
      },
    },
  });
  return user?.badges ?? [];
};

/** 전역 배지 캐시(전체) — 전역 태그 */
export const getCachedAllBadges = () => {
  const cached = nextCache(getAllBadges, ["badges-all"], {
    tags: [T.BADGES_ALL()],
  });
  return cached();
};

/** 유저 보유 배지 캐시 — per-id 태그 */
export const getCachedUserBadges = (userId: number) => {
  const cached = nextCache(
    async (uid: number) => getUserBadges(uid),
    ["user-badges-by-id"],
    { tags: [T.USER_BADGES_ID(userId)] }
  );
  return cached(userId);
};
