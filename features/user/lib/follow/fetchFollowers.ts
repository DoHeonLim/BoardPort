/**
 * File Name : features/user/lib/follow/fetchFollowers.ts
 * Description : 팔로워 목록 페이지네이션 (모달 on-demand / 키셋 커서 / 1페이지 캐시 / 배치 조립)
 * Author : 임도헌
 *
 * Key Points
 * - 팔로워/팔로잉 "1페이지 캐시"는 follow 테이블의 id 목록만 보관한다. (유저 스냅샷 포함 금지)
 * - 화면 표시용 username/avatar는 user 테이블을 "배치(findMany IN)"로 1회 조회해 조립한다.
 *   - cold cache 기준: (follow 목록 1회 + user 배치 1회 + 개인화 follow 배치 1회) = 최대 3쿼리
 *   - Promise.all(per-id) 방식의 N쿼리 가능성을 제거한다.
 * - editProfile에서 revalidateTag(`user-core-id-${id}`)는 계속 유지한다.
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created    팔로워 목록 조회 최초 구현
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/actions → lib/user/follow로 분리
 * 2025.10.12  임도헌   Modified   모달 on-demand 조회 + 키셋 커서 + isFollowedByViewer 동반 계산
 * 2025.10.23  임도헌   Modified   username 정규화 후 즉시 id 해석, per-id 태그 규격화(user-followers-id-${id}),
 *                                username→id 얇은 캐시 태그(user-username-id-${uname}), 1페이지 캐시 도입
 * 2025.12.20  임도헌   Modified   1페이지 캐시에 +1(take)로 hasMore 계산, cursor null 타입(Union) 안전 처리
 * 2025.12.31  임도헌   Modified   stale avatar 근본 해결: 1페이지 캐시는 id 목록만, user 스냅샷은 배치 조립 방식으로 변경
 * 2026.01.01  임도헌   Modified   username→id 해석 공용 유틸(resolveUserIdByUsernameCached)로 통합
 * 2026.01.05  임도헌   Modified   followers 맞팔로잉 지원: isMutualWithOwner 계산 추가(owner -> rowUser)
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 */

"use server";

import "server-only";

import db from "@/lib/db";
import getSession from "@/lib/session";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { resolveUserIdByUsernameCached } from "@/features/user/lib/resolveUserIdByUsernameCached";
import type { FollowListUser, FollowListCursor } from "@/types/profile";

/* 1페이지 전용 캐시 (id 목록만) */
type FollowersRow = {
  id: number; // follow row id (키셋 커서)
  followerId: number;
};

const getFollowersFirstPageCached = (ownerId: number, limit: number) => {
  const take = limit + 1;

  const cached = nextCache(
    async (oid: number): Promise<FollowersRow[]> =>
      db.follow.findMany({
        // owner(=followingId)를 팔로우하는 사람들이 follower
        where: { followingId: oid },
        select: { id: true, followerId: true },
        orderBy: { id: "desc" },
        take,
      }),
    ["user-followers-page-by-id", String(ownerId), `take:${take}`],
    { tags: [T.USER_FOLLOWERS_ID(ownerId)] }
  );

  return cached(ownerId);
};

async function batchFetchUserLiteByIds(ids: number[]) {
  if (!ids.length) {
    return new Map<
      number,
      { id: number; username: string; avatar: string | null }
    >();
  }

  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, avatar: true },
  });

  return new Map(
    users.map((u) => [
      u.id,
      { id: u.id, username: u.username, avatar: u.avatar ?? null },
    ])
  );
}

export async function fetchFollowers(
  username: string,
  opts: { cursor?: FollowListCursor; limit?: number } = {}
) {
  const limitRaw = opts.limit ?? 20;
  const limit = Math.max(1, Math.min(limitRaw, 50));
  const cursorLastId = opts.cursor?.lastId ?? null;

  const session = await getSession();
  const viewerId = session?.id ?? null;

  // 1) username → ownerId
  const ownerId = await resolveUserIdByUsernameCached(username);
  if (!ownerId) {
    return {
      users: [] as FollowListUser[],
      nextCursor: null as FollowListCursor,
    };
  }

  // 2) follow rows 조회 (1페이지 캐시 / 이후 비캐시)
  const rows: FollowersRow[] = cursorLastId
    ? await db.follow.findMany({
        where: { followingId: ownerId, id: { lt: cursorLastId } },
        select: { id: true, followerId: true },
        orderBy: { id: "desc" },
        take: limit + 1,
      })
    : await getFollowersFirstPageCached(ownerId, limit);

  // 3) hasMore & slice
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  // 4) userLite 배치 조립 (1쿼리)
  const ids = page.map((r) => r.followerId);
  const liteById = await batchFetchUserLiteByIds(ids);

  // 5-A) 버튼 SSOT: viewer -> rowUser (1쿼리)
  // viewer가 이 row 유저를 팔로우 중인지(팔로우 버튼 상태)
  let viewerFollowsSet = new Set<number>();
  if (viewerId && ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: viewerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    viewerFollowsSet = new Set(hits.map((h) => h.followingId));
  }

  // 5-B) 섹션 분리: owner -> rowUser (1쿼리)
  // followers 모달에서 "맞팔" 의미:
  // - rowUser는 owner를 팔로우하고 있는 사람들(ids)
  // - owner가 rowUser를 팔로우하고 있으면 상호 => isMutualWithOwner=true
  let mutualWithOwnerSet = new Set<number>();
  if (ids.length) {
    const hitsBack = await db.follow.findMany({
      where: { followerId: ownerId, followingId: { in: ids } },
      select: { followingId: true }, // owner가 팔로우하는 대상(=rowUser)
    });
    mutualWithOwnerSet = new Set(hitsBack.map((h) => h.followingId));
  }

  // 6) DTO 조립 (원본 page 순서 유지)
  const users: FollowListUser[] = [];
  for (const r of page) {
    const u = liteById.get(r.followerId);
    if (!u) continue; // (드물게) 유저가 삭제된 경우 방어

    users.push({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
      isFollowedByViewer: viewerFollowsSet.has(u.id),
      isMutualWithOwner: mutualWithOwnerSet.has(u.id),
    });
  }

  // 7) nextCursor
  const tail = page[page.length - 1];
  const nextCursor: FollowListCursor =
    hasMore && tail ? { lastId: tail.id } : null;

  return { users, nextCursor };
}
