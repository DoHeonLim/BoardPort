/**
 * File Name : features/user/lib/follow/fetchFollowing.ts
 * Description : 팔로잉 목록 페이지네이션 (모달 on-demand / 키셋 커서 / 1페이지 캐시 / 배치 조립)
 * Author : 임도헌
 *
 * Key Points
 * - 팔로잉 목록 1페이지 캐시는 follow 테이블의 id 목록만 보관한다. (유저 스냅샷 포함 금지)
 * - username/avatar는 user 테이블을 "배치(findMany IN)"로 1회 조회해 조립한다.
 * - 개인화(isFollowedByViewer)는 viewer별로 달라 캐시하면 파편화가 커지므로 비캐시 배치 조회로 처리한다.
 * - 섹션 분리(맞팔로잉/나머지)는 owner 기준 isMutualWithOwner만 제공한다.
 *   - 팔로잉 모달에서 맞팔로잉 의미:
 *     - rowUser(내가 팔로우하는 사람)가 owner(=프로필 주인)를 팔로우하면 true (rowUser -> owner)
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created    팔로잉 목록 조회 최초 구현
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/actions → lib/user/follow로 분리
 * 2025.10.12  임도헌   Modified   모달 on-demand 조회 + 키셋 커서 + isFollowedByViewer 동반 계산
 * 2025.10.23  임도헌   Modified   username 정규화 후 즉시 id 해석, per-id 태그 규격화(user-following-id-${id}),
 *                                username→id 얇은 캐시 태그(user-username-id-${uname}), 1페이지 캐시 도입
 * 2025.12.20  임도헌   Modified   1페이지 캐시에 +1(take)로 hasMore 계산, cursor null 타입(Union) 안전 처리
 * 2025.12.31  임도헌   Modified   stale avatar 근본 해결: 1페이지 캐시는 id 목록만, user 스냅샷은 배치 조립 방식으로 변경
 * 2026.01.01  임도헌   Modified   username→id 해석 공용 유틸(resolveUserIdByUsernameCached)로 통합
 * 2026.01.05  임도헌   Modified   팔로잉 모달 맞팔 분리 기준을 owner 기준(isMutualWithOwner)으로 정리
 * 2026.01.06  임도헌   Modified   Key Points/용어 정리: isMutualWithOwner로 일원화
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

type FollowingRow = {
  id: number; // follow row id (키셋 커서)
  followingId: number;
};

const getFollowingFirstPageCached = (ownerId: number, limit: number) => {
  const take = limit + 1;

  const cached = nextCache(
    async (oid: number): Promise<FollowingRow[]> =>
      db.follow.findMany({
        where: { followerId: oid },
        select: { id: true, followingId: true },
        orderBy: { id: "desc" },
        take,
      }),
    ["user-following-page-by-id", String(ownerId), `take:${take}`],
    { tags: [T.USER_FOLLOWING_ID(ownerId)] }
  );

  return cached(ownerId);
};

async function batchFetchUserLiteByIds(ids: number[]) {
  if (!ids.length)
    return new Map<
      number,
      { id: number; username: string; avatar: string | null }
    >();

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

export async function fetchFollowing(
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
  if (!ownerId)
    return {
      users: [] as FollowListUser[],
      nextCursor: null as FollowListCursor,
    };

  // 2) rows (1페이지 캐시 / 이후 비캐시)
  const rows: FollowingRow[] = cursorLastId
    ? await db.follow.findMany({
        where: { followerId: ownerId, id: { lt: cursorLastId } },
        select: { id: true, followingId: true },
        orderBy: { id: "desc" },
        take: limit + 1,
      })
    : await getFollowingFirstPageCached(ownerId, limit);

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  const ids = page.map((r) => r.followingId);
  const liteById = await batchFetchUserLiteByIds(ids);

  // 3-A) 버튼 SSOT: viewer -> rowUser
  let viewerFollowsSet = new Set<number>();
  if (viewerId && ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: viewerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    viewerFollowsSet = new Set(hits.map((h) => h.followingId));
  }

  // 3-B) 섹션 분리: rowUser -> owner  핵심(owner 기준 맞팔)
  // 팔로잉 목록에서 "맞팔" = 내가 팔로우하는 그 사람이 나(owner)를 팔로우하느냐
  let mutualWithOwnerSet = new Set<number>();
  if (ids.length) {
    const hitsBack = await db.follow.findMany({
      where: { followerId: { in: ids }, followingId: ownerId },
      select: { followerId: true },
    });
    mutualWithOwnerSet = new Set(hitsBack.map((h) => h.followerId));
  }

  // 4) DTO 조립
  const users: FollowListUser[] = [];
  for (const r of page) {
    const u = liteById.get(r.followingId);
    if (!u) continue;

    users.push({
      id: u.id,
      username: u.username,
      avatar: u.avatar,
      isFollowedByViewer: viewerFollowsSet.has(u.id),
      isMutualWithOwner: mutualWithOwnerSet.has(u.id),
    });
  }

  const tail = page[page.length - 1];
  const nextCursor: FollowListCursor =
    hasMore && tail ? { lastId: tail.id } : null;

  return { users, nextCursor };
}
