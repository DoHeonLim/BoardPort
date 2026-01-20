/**
 * File Name : features/user/lib/getCachedUserLiteById.ts
 * Description : 유저 최소 정보(id/username/avatar) per-id 캐시 (tag: user-core-id-${id})
 * Author : 임도헌
 *
 * Key Points
 * - 팔로우 리스트(팔로워/팔로잉) 1페이지 캐시는 "유저 스냅샷"을 포함하면 stale이 쉽게 발생한다.
 * - 따라서 팔로우 리스트 캐시는 "id 목록"만 보관하고,
 *   실제 표시용 username/avatar는 user-core-id-${id} 태그를 가진 per-id 캐시로 조립한다.
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.31  임도헌   Created   팔로우 리스트 stale avatar 해결을 위한 per-id user-lite 캐시 도입
 * 2026.01.19  임도헌   Moved     lib/user -> features/user/lib
 */

"use server";

import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";

export type UserLite = {
  id: number;
  username: string;
  avatar: string | null;
};

/**
 * per-id 캐시 엔트리
 * - KEY : ["user-lite-by-id", id]
 * - TAG : user-core-id-${id}
 *
 * editProfile에서 revalidateTag(`user-core-id-${current.id}`)만 호출해도
 * 이 캐시를 쓰는 모든 화면이 최신 avatar/username으로 회복된다.
 */
export function getCachedUserLiteById(id: number) {
  const cached = nextCache(
    async (uid: number): Promise<UserLite | null> => {
      const u = await db.user.findUnique({
        where: { id: uid },
        select: { id: true, username: true, avatar: true },
      });
      if (!u) return null;
      return { id: u.id, username: u.username, avatar: u.avatar ?? null };
    },
    ["user-lite-by-id", String(id)],
    { tags: [T.USER_CORE_ID(id)] }
  );

  return cached(id);
}
