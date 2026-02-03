/**
 * File Name : features/user/service/follow.ts
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
import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { isUniqueConstraintError } from "@/lib/errors";
import { resolveUserIdByUsername } from "./profile";
import type { FollowListCursor, FollowListUser } from "@/features/user/types";

// --- 1. Followers Cache Helpers ---

type FollowersRow = { id: number; followerId: number };

/**
 * 팔로워 목록 첫 페이지 캐싱 (DB 부하 감소)
 *
 * - `unstable_cache`를 사용하여 첫 페이지의 "관계(Relation)" 데이터만 캐싱합니다.
 * - 유저 상세 정보(User)는 포함하지 않으므로 캐시 용량이 작습니다.
 * - 이후 비즈니스 로직에서 `batchFetchUserLiteByIds`로 최신 유저 정보를 조립합니다.
 *   (관계는 변하지 않아도 유저 닉네임/프사는 변할 수 있기 때문)
 *
 * @param ownerId - 조회 대상 유저 ID
 * @param limit - 조회 개수
 */
const getFollowersFirstPageCached = (ownerId: number, limit: number) => {
  const take = limit + 1;
  const cached = nextCache(
    async (oid: number): Promise<FollowersRow[]> =>
      db.follow.findMany({
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

// --- 2. Following Cache Helpers ---

type FollowingRow = { id: number; followingId: number };

/**
 * 팔로잉 목록 첫 페이지 캐싱 (DB 부하 감소)
 *
 * @param ownerId - 조회 대상 유저 ID
 * @param limit - 조회 개수
 */
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

// --- Helper: Batch User Info ---
/**
 * ID 목록으로 유저 정보를 한 번에 조회 (Batch Fetch)
 * - N+1 문제 방지를 위해 `WHERE id IN (...)` 쿼리를 사용합니다.
 * - 조회된 유저 정보를 Map으로 변환하여 O(1) 접근이 가능하게 합니다.
 */
async function batchFetchUserLiteByIds(ids: number[]) {
  if (!ids.length) return new Map();
  const users = await db.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, username: true, avatar: true },
  });
  return new Map(users.map((u) => [u.id, u]));
}

/** --- Public API ---
 - 1. Username -> ID 변환
 - 2. 목록 조회 (첫 페이지는 캐시, 이후는 커서 기반 DB 조회)
 - 3. 유저 정보 조립 (Batch Fetch)
 - 4. 관계 상태 확인 (Viewer와의 관계, Owner와의 관계)
 - 5. 결과 매핑 및 반환
 */
/**
 * 팔로워 목록 조회 (Cursor Paging)
 */
export async function getFollowersService(
  username: string,
  viewerId: number | null,
  cursor: FollowListCursor,
  limit: number = 20
) {
  // 1. Username -> ID 변환
  const ownerId = await resolveUserIdByUsername(username);
  if (!ownerId) return { users: [], nextCursor: null };

  const cursorLastId = cursor?.lastId ?? null;
  const take = Math.min(limit, 50) + 1;

  // 2. 목록 조회 (첫 페이지는 캐시 사용)
  const rows: FollowersRow[] = cursorLastId
    ? await db.follow.findMany({
        where: { followingId: ownerId, id: { lt: cursorLastId } },
        select: { id: true, followerId: true },
        orderBy: { id: "desc" },
        take,
      })
    : await getFollowersFirstPageCached(ownerId, Math.min(limit, 50));

  const hasMore = rows.length > Math.min(limit, 50);
  const page = hasMore ? rows.slice(0, Math.min(limit, 50)) : rows;

  // 3. 유저 정보 조립 (Batch Fetch)
  const ids = page.map((r) => r.followerId);
  const liteById = await batchFetchUserLiteByIds(ids);

  // 4. 관계 상태 확인 (viewer -> row / owner -> row)

  // viewer -> row (팔로우 버튼 상태용)
  const viewerFollowsSet = new Set<number>();
  if (viewerId && ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: viewerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    hits.forEach((h) => viewerFollowsSet.add(h.followingId));
  }

  // owner -> row (맞팔 섹션 분리용)
  const mutualSet = new Set<number>();
  if (ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: ownerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    hits.forEach((h) => mutualSet.add(h.followingId));
  }

  // 5. 결과 매핑
  const users: FollowListUser[] = [];
  for (const r of page) {
    const u = liteById.get(r.followerId);
    if (!u) continue;
    users.push({
      id: u.id,
      username: u.username,
      avatar: u.avatar ?? null,
      isFollowedByViewer: viewerFollowsSet.has(u.id),
      isMutualWithOwner: mutualSet.has(u.id),
    });
  }

  const tail = page[page.length - 1];
  const nextCursor: FollowListCursor =
    hasMore && tail ? { lastId: tail.id } : null;

  return { users, nextCursor };
}

/**
 * 팔로잉 목록 조회 (Cursor Paging)
 */
export async function getFollowingService(
  username: string,
  viewerId: number | null,
  cursor: FollowListCursor,
  limit: number = 20
) {
  const ownerId = await resolveUserIdByUsername(username);
  if (!ownerId) return { users: [], nextCursor: null };

  const cursorLastId = cursor?.lastId ?? null;
  const take = Math.min(limit, 50) + 1;

  // 1. 목록 조회
  const rows: FollowingRow[] = cursorLastId
    ? await db.follow.findMany({
        where: { followerId: ownerId, id: { lt: cursorLastId } },
        select: { id: true, followingId: true },
        orderBy: { id: "desc" },
        take,
      })
    : await getFollowingFirstPageCached(ownerId, Math.min(limit, 50));

  const hasMore = rows.length > Math.min(limit, 50);
  const page = hasMore ? rows.slice(0, Math.min(limit, 50)) : rows;

  // 2. 유저 정보 조립
  const ids = page.map((r) => r.followingId);
  const liteById = await batchFetchUserLiteByIds(ids);

  // 3. 관계 상태 확인
  const viewerFollowsSet = new Set<number>();
  if (viewerId && ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: viewerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    hits.forEach((h) => viewerFollowsSet.add(h.followingId));
  }

  // row -> owner (맞팔 여부: 이 리스트 자체가 owner가 팔로우하는 사람들이므로, row가 owner를 팔로우하는지 확인)
  const mutualSet = new Set<number>();
  if (ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: { in: ids }, followingId: ownerId },
      select: { followerId: true },
    });
    hits.forEach((h) => mutualSet.add(h.followerId));
  }

  // 4. 결과 매핑
  const users: FollowListUser[] = [];
  for (const r of page) {
    const u = liteById.get(r.followingId);
    if (!u) continue;
    users.push({
      id: u.id,
      username: u.username,
      avatar: u.avatar ?? null,
      isFollowedByViewer: viewerFollowsSet.has(u.id),
      isMutualWithOwner: mutualSet.has(u.id),
    });
  }

  const tail = page[page.length - 1];
  const nextCursor: FollowListCursor =
    hasMore && tail ? { lastId: tail.id } : null;

  return { users, nextCursor };
}

// --- Toggle Logic ---

type ToggleFollowResult = {
  changed: boolean;
  isFollowing: boolean;
  counts: { viewerFollowing: number; targetFollowers: number };
};

/**
 * 팔로우하기
 * - 중복(P2002) 시 에러 무시하고 changed=false 반환 (멱등성 보장)
 */
export async function followUserService(
  viewerId: number,
  targetId: number
): Promise<ToggleFollowResult> {
  let changed = false;
  try {
    await db.follow.create({
      data: { followerId: viewerId, followingId: targetId },
    });
    changed = true;
  } catch (e) {
    if (!isUniqueConstraintError(e, ["followerId", "followingId"])) throw e;
  }

  // 최신 카운트 반환 (클라이언트 보정용)
  const counts = await getCounts(viewerId, targetId);
  return { changed, isFollowing: true, counts };
}

/**
 * 언팔로우하기
 */
export async function unfollowUserService(
  viewerId: number,
  targetId: number
): Promise<ToggleFollowResult> {
  const res = await db.follow.deleteMany({
    where: { followerId: viewerId, followingId: targetId },
  });
  const changed = res.count > 0;

  const counts = await getCounts(viewerId, targetId);
  return { changed, isFollowing: false, counts };
}

/** 카운트 조회 헬퍼 */
async function getCounts(viewerId: number, targetId: number) {
  const [viewerFollowing, targetFollowers] = await Promise.all([
    db.follow.count({ where: { followerId: viewerId } }),
    db.follow.count({ where: { followingId: targetId } }),
  ]);
  return { viewerFollowing, targetFollowers };
}
