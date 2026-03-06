/**
 * File Name : features/user/service/follow.ts
 * Description : 팔로워 목록 페이지네이션 (모달 on-demand / 키셋 커서 / 1페이지 캐시 / 배치 조립)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created    팔로워 목록 조회 최초 구현
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/actions → lib/user/follow로 분리
 * 2025.10.12  임도헌   Modified   모달 on-demand 조회 + 키셋 커서 + isFollowedByViewer 동반 계산
 * 2025.10.23  임도헌   Modified   username 정규화 후 즉시 id 해석, per-id 태그 규격화(user-followers-id-${id}),
 *                                 username→id 얇은 캐시 태그(user-username-id-${uname}), 1페이지 캐시 도입
 * 2025.12.20  임도헌   Modified   1페이지 캐시에 +1(take)로 hasMore 계산, cursor null 타입(Union) 안전 처리
 * 2025.12.31  임도헌   Modified   stale avatar 근본 해결: 1페이지 캐시는 id 목록만, user 스냅샷은 배치 조립 방식으로 변경
 * 2026.01.01  임도헌   Modified   username→id 해석 공용 유틸(resolveUserIdByUsernameCached)로 통합
 * 2026.01.05  임도헌   Modified   followers 맞팔로잉 지원: isMutualWithOwner 계산 추가(owner -> rowUser)
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 * 2026.02.22  임도헌   Modified   정지된 유저(Banned) 팔로우 원천 차단 가드 추가
 * 2026.03.03  임도헌   Modified   unstable_cache 래퍼 및 1페이지 분기 로직 제거, 단일 페이징 쿼리로 통합
 * 2026.03.07  임도헌   Modified   요청자 정지 가드 및 팔로우 실패 사유 전달 정합성 보강
 * 2026.03.07  임도헌   Modified   팔로우 목록에서 정지/차단 관계 유저 숨김 처리 추가
 */
import "server-only";
import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import { resolveUserIdByUsername } from "@/features/user/service/profile";
import {
  checkBlockRelation,
  getBlockedUserIds,
} from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";
import type { FollowListCursor, FollowListUser } from "@/features/user/types";

// --- Helper: Batch User Info ---
/**
 * ID 목록으로 유저 정보를 한 번에 조회 (Batch Fetch)
 * - N+1 문제 방지를 위해 `WHERE id IN (...)` 쿼리를 사용
 * - 조회된 유저 정보를 Map으로 변환하여 O(1) 접근이 가능
 */
async function batchFetchUserLiteByIds(ids: number[]) {
  if (!ids.length) return new Map();
  const users = await db.user.findMany({
    where: { id: { in: ids }, bannedAt: null },
    select: { id: true, username: true, avatar: true },
  });
  return new Map(users.map((u) => [u.id, u]));
}

/**
 * 조회자 기준으로 차단 관계에 있는 유저를 팔로우 목록에서 제외
 */
async function filterVisibleFollowRows<T extends { followerId?: number; followingId?: number }>(
  rows: T[],
  viewerId: number | null
) {
  if (!viewerId || rows.length === 0) return rows;

  const blockedIds = new Set(await getBlockedUserIds(viewerId));
  if (blockedIds.size === 0) return rows;

  return rows.filter((row) => {
    const targetId = row.followerId ?? row.followingId;
    return targetId ? !blockedIds.has(targetId) : true;
  });
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
  const ownerId = await resolveUserIdByUsername(username);
  if (!ownerId) return { users: [], nextCursor: null };

  const cursorLastId = cursor?.lastId ?? null;
  const take = Math.min(limit, 50) + 1;

  // 1. 목록 조회 (Cursor 기반 단일화)
  const rows = await db.follow.findMany({
    where: {
      followingId: ownerId,
      ...(cursorLastId ? { id: { lt: cursorLastId } } : {}),
    },
    select: { id: true, followerId: true },
    orderBy: { id: "desc" },
    take,
  });

  const hasMore = rows.length > Math.min(limit, 50);
  const page = hasMore ? rows.slice(0, Math.min(limit, 50)) : rows;
  const visiblePage = await filterVisibleFollowRows(page, viewerId);

  // 2. 유저 정보 조립
  const ids = visiblePage.map((r) => r.followerId);
  const liteById = await batchFetchUserLiteByIds(ids);

  // 3. 관계 상태 확인 (viewer -> row / owner -> row)
  const viewerFollowsSet = new Set<number>();
  if (viewerId && ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: viewerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    hits.forEach((h) => viewerFollowsSet.add(h.followingId));
  }

  const mutualSet = new Set<number>();
  if (ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: ownerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    hits.forEach((h) => mutualSet.add(h.followingId));
  }

  // 4. 결과 매핑
  const users: FollowListUser[] = [];
  for (const r of visiblePage) {
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

  const rows = await db.follow.findMany({
    where: {
      followerId: ownerId,
      ...(cursorLastId ? { id: { lt: cursorLastId } } : {}),
    },
    select: { id: true, followingId: true },
    orderBy: { id: "desc" },
    take,
  });

  const hasMore = rows.length > Math.min(limit, 50);
  const page = hasMore ? rows.slice(0, Math.min(limit, 50)) : rows;
  const visiblePage = await filterVisibleFollowRows(page, viewerId);

  const ids = visiblePage.map((r) => r.followingId);
  const liteById = await batchFetchUserLiteByIds(ids);

  const viewerFollowsSet = new Set<number>();
  if (viewerId && ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: viewerId, followingId: { in: ids } },
      select: { followingId: true },
    });
    hits.forEach((h) => viewerFollowsSet.add(h.followingId));
  }

  const mutualSet = new Set<number>();
  if (ids.length) {
    const hits = await db.follow.findMany({
      where: { followerId: { in: ids }, followingId: ownerId },
      select: { followerId: true },
    });
    hits.forEach((h) => mutualSet.add(h.followerId));
  }

  const users: FollowListUser[] = [];
  for (const r of visiblePage) {
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
  const viewerStatus = await validateUserStatus(viewerId);
  if (!viewerStatus.success) {
    throw new Error(viewerStatus.error);
  }

  // 대상 유저가 정지된 상태인지 확인하여 팔로우 차단
  const targetStatus = await validateUserStatus(targetId);
  if (!targetStatus.success) {
    throw new Error(
      "운영 정책 위반으로 이용이 정지된 사용자는 팔로우할 수 없습니다."
    );
  }
  // 차단 관계 확인
  const isBlocked = await checkBlockRelation(viewerId, targetId);
  if (isBlocked) {
    throw new Error("차단 관계에서는 팔로우할 수 없습니다.");
  }
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
  const viewerStatus = await validateUserStatus(viewerId);
  if (!viewerStatus.success) {
    throw new Error(viewerStatus.error);
  }

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
