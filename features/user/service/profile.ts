/**
 * File Name : features/user/service/profile.ts
 * Description : 유저 프로필 조회 서비스 (Profile, Lite Info, Channel)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/actions → lib/user로 분리
 * 2025.10.05  임도헌   Modified   MyProfile 의존 필드 최소화
 * 2025.10.07  임도헌   Modified   반환 타입(UserProfile) 추가
 * 2025.10.12  임도헌   Modified   팔로우 옵션 제거(목록/Set는 전용 API로 분리), 시그니처 단순화
 * 2025.10.23  임도헌   Modified   username→id 해석 후 전 구간 id 기반으로 정리, 캐시 태그 고정화
 * 2025.10.29  임도헌   Modified   프로필 코어/팔로우 카운트 캐시 분리, username→id 얇은 캐시 추가, revalidateTag 메모 보강
 * 2025.12.12  임도헌   Modified   캐시 코어에서 email 제거(민감정보), isMe일 때만 비캐시로 email 조회, debug log 가드
 * 2026.01.01  임도헌   Modified   username→id 해석 공용 유틸(resolveUserIdByUsernameCached)로 통합
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 * 2026.01.24  임도헌   Modified   getUserProfile, getUserInfoById, getUserChannel 통합 및 최적화
 */

import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { normalizeUsername } from "@/features/user/utils/normalize";
import type { UserProfile, UserLite } from "@/features/user/types";

// -----------------------------------------------------------------------------
// 1. Internal Cached Helpers
// -----------------------------------------------------------------------------

/**
 * Username -> ID 해석 (Base Cache)
 * - 불필요한 DB 조회를 줄이기 위해 username 매핑 결과를 캐싱합니다.
 */
const _resolveUserIdBase = nextCache(
  async (username: string) => {
    const u = await db.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return u?.id ?? null;
  },
  ["user-username-resolve"],
  { tags: [] } // 태그는 아래 wrapper에서 동적으로 주입
);

/**
 * 유저 기본 정보 조회 (Base Cache)
 * - 프로필 상단에 필요한 핵심 데이터만 조회합니다.
 */
const _getUserCoreByIdBase = nextCache(
  async (id: number) =>
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar: true,
        created_at: true,
        emailVerified: true,
      },
    }),
  ["user-core-by-id"],
  { tags: [] }
);

async function getUserCoreByIdCached(id: number) {
  const withTag = nextCache(
    (x: number) => _getUserCoreByIdBase(x),
    ["user-core-by-id"],
    { tags: [T.USER_CORE_ID(id)] } // ID별 태그 적용
  );
  return withTag(id);
}

/**
 * 팔로워/팔로잉 카운트 조회 (Base Cache)
 * - 변경 빈도가 높으므로 별도 쿼리로 분리하여 캐싱합니다.
 */
const _getUserFollowCountsBase = nextCache(
  async (id: number) => {
    const [followers, following] = await Promise.all([
      db.follow.count({ where: { followingId: id } }),
      db.follow.count({ where: { followerId: id } }),
    ]);
    return { followers, following };
  },
  ["user-follow-counts"],
  { tags: [] }
);

async function getUserFollowCountsCached(id: number) {
  const withTag = nextCache(
    (x: number) => _getUserFollowCountsBase(x),
    ["user-follow-counts"],
    { tags: [T.USER_FOLLOWERS_ID(id), T.USER_FOLLOWING_ID(id)] }
  );
  return withTag(id);
}

// -----------------------------------------------------------------------------
// 2. Public API
// -----------------------------------------------------------------------------

/**
 * username을 userId로 변환합니다. (Cached)
 * - URL 파라미터(username)를 DB ID로 변환할 때 사용합니다.
 */
export async function resolveUserIdByUsername(rawUsername: string) {
  const uname = normalizeUsername(rawUsername);
  if (!uname) return null;

  // per-username 태그 주입하여 닉네임 변경 시 캐시 무효화 지원
  const withTag = nextCache(
    (u: string) => _resolveUserIdBase(u),
    ["user-username-resolve"],
    { tags: [T.USER_USERNAME_ID(uname)] }
  );

  return withTag(uname);
}

/**
 * 프로필 페이지용 상세 정보 조회
 *
 * @param {number | null} targetId - 조회 대상 유저 ID
 * @param {number | null} viewerId - 조회자 ID
 */
export async function getUserProfile(
  targetId: number | null,
  viewerId: number | null
): Promise<UserProfile | null> {
  if (!targetId) return null;

  // 1. Core 정보와 카운트 정보를 병렬 조회 (Cached)
  const [core, counts] = await Promise.all([
    getUserCoreByIdCached(targetId),
    getUserFollowCountsCached(targetId),
  ]);

  if (!core) return null;

  const isMe = !!viewerId && viewerId === core.id;

  // 2. 이메일은 본인일 때만 별도 조회 (보안, 비캐시)
  let email: string | null = null;
  if (isMe) {
    const me = await db.user.findUnique({
      where: { id: core.id },
      select: { email: true },
    });
    email = me?.email ?? null;
  }

  // 3. 팔로우 여부 확인 (비캐시 - Viewer에 따라 달라짐)
  let isFollowing = false;
  if (viewerId && !isMe) {
    const rel = await db.follow.findUnique({
      where: {
        followerId_followingId: { followerId: viewerId, followingId: core.id },
      },
      select: { followerId: true },
    });
    isFollowing = !!rel;
  }

  return {
    id: core.id,
    username: core.username,
    avatar: core.avatar ?? null,
    email,
    created_at: core.created_at,
    emailVerified: core.emailVerified,
    _count: { followers: counts.followers, following: counts.following },
    isMe,
    isFollowing,
    viewerId,
  };
}

/**
 * 유저 최소 정보(Lite) 조회
 * - 세션 없이 ID만으로 조회할 때 사용 (예: 댓글 작성자 정보 등)
 */
export async function getUserInfoById(
  userId: number
): Promise<UserLite | null> {
  if (!Number.isFinite(userId) || userId <= 0) return null;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, avatar: true },
  });

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    avatar: user.avatar,
  };
}

/**
 * 방송국용 경량 정보 조회 (채널 페이지)
 * - username 기반으로 기본 정보와 팔로우 통계만 빠르게 조회합니다.
 */
export async function getUserChannel(username: string) {
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

  return user;
}

/**
 * per-id UserLite 캐시
 * - 리스트 등에서 반복적으로 사용되는 유저 정보를 캐싱합니다.
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
