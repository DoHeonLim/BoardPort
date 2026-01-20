/**
 * File Name : features/user/lib/getUserProfile.ts
 * Description : 프로필 화면용 유저 프로필 조회 (followers/following + isFollowing)
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
 * 2026.01.01  임도헌   Modified  username→id 해석 공용 유틸(resolveUserIdByUsernameCached)로 통합
 * 2026.01.19  임도헌   Moved     lib/user -> features/user/lib
 */

"use server";

import db from "@/lib/db";
import { redirect } from "next/navigation";
import { unstable_cache as nextCache } from "next/cache";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import { resolveUserIdByUsernameCached } from "@/features/user/lib/resolveUserIdByUsernameCached";
import type { UserProfile } from "@/types/profile";

/**
 * 캐시/무효화 메모
 * - 프로필 코어(이름/아바타/생성일 등): revalidateTag(`user-core-id-${id}`)
 * - 팔로우 카운트:                   revalidateTag(`user-followers-id-${id}`) 또는 `user-following-id-${id}`
 * - username→id 해석:                revalidateTag(`user-username-id-${normalizedUsername}`)
 *                                    (resolveUserIdByUsernameCached 공용 유틸이 해당 태그를 사용)
 *
 * 주의: 개인화 데이터(isMe, isFollowing, viewerId)는 비캐시로 매 요청 계산.
 */

/** 입력 시그니처: 다양한 식별자를 받되, 내부에서는 id로 통일 */
export type GetUserProfileParams = {
  /** 특정 유저 id (없으면 세션 유저) */
  targetId?: number;
  /** username (라우트 인자 등). 서버에서 즉시 id로 해석 */
  username?: string;
  /** [username] 페이지에서 '본인'이면 /profile로 리다이렉트 */
  redirectIfSelfToProfile?: boolean;
};

/*  프로필 코어(id 기반) 캐시 (민감정보 미포함: email 제거)
 *
 * 왜 _getCached... 와 getCached... 를 나누나?
 * - unstable_cache(nextCache)는 "정의 시점"에 keyParts/tags가 정해지는 성격이 강하다.
 * - 여기서는 id별로 tag(user-core-id-${id})를 정확히 붙여야 정밀 revalidateTag가 가능하다.
 * - 따라서:
 *   1) _getCachedUserCoreById : tags 없이 '베이스 캐시 함수'를 만든다. (공용 로직)
 *   2) getCachedUserCoreById  : 호출 시점에 wrapper로 감싸 "이번 id에 대한 tag"를 주입한다.
 *
 * 결과적으로:
 * - 캐시 엔트리는 keyParts 기준으로 공유되되,
 * - 무효화(revalidateTag)는 id별 태그로 정밀하게 수행할 수 있다.
 */
const _getCachedUserCoreById = nextCache(
  async (id: number) =>
    db.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar: true,
        // email: true, // 민감정보는 캐시에 넣지 않음
        created_at: true,
        emailVerified: true,
      },
    }),
  ["user-core-by-id"],
  { tags: [] } // base는 태그를 비워두고, 아래 wrapper에서 동적 주입한다.
);

async function getCachedUserCoreById(id: number) {
  /**
   * 동적 태그 주입 wrapper
   * - per-id 태그를 여기서 부착: user-core-id-${id}
   * - 편의상 wrapper 함수는 매 호출마다 생성되지만, 런타임/유지보수 상 이 패턴이 가장 안전하다.
   */
  const withTag = nextCache(
    (x: number) => _getCachedUserCoreById(x),
    ["user-core-by-id"],
    { tags: [T.USER_CORE_ID(id)] }
  );

  return withTag(id);
}

/** isMe일 때만 email을 비캐시로 조회 */
async function getMyEmail(userId: number): Promise<string | null> {
  const me = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return me?.email ?? null;
}

/*  팔로우 카운트 캐시 (팔로우 전용 태그로 정밀 무효화)                        */
const _getCachedUserFollowCounts = nextCache(
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

async function getCachedUserFollowCounts(id: number) {
  const withTag = nextCache(
    (x: number) => _getCachedUserFollowCounts(x),
    ["user-follow-counts"],
    { tags: [T.USER_FOLLOWERS_ID(id), T.USER_FOLLOWING_ID(id)] }
  );
  return withTag(id);
}

export async function getUserProfile(
  params: GetUserProfileParams = {}
): Promise<UserProfile | null> {
  const session = await getSession();
  const viewerId = session?.id ?? null;

  // debug log (dev only)
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("getUserProfile session", session);
  }

  // 1) targetId 우선 결정 (username 있으면 즉시 해석)
  let targetId: number | null = null;

  if (typeof params.targetId === "number") {
    targetId = params.targetId;
  } else if (params.username) {
    targetId = await resolveUserIdByUsernameCached(params.username);
    if (!targetId) return null;
  } else if (viewerId) {
    targetId = viewerId;
  } else {
    // 식별자 없음 + 비로그인
    return null;
  }

  // 2) 코어 정보 + 팔로우 카운트 병렬 취득 (각각 별도 캐시/태그)
  const [core, counts] = await Promise.all([
    getCachedUserCoreById(targetId),
    getCachedUserFollowCounts(targetId),
  ]);

  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("getUserProfile core", core);
  }

  if (!core) return null;

  // 3) 자기 자신 가드/리다이렉트
  const isMe = !!viewerId && viewerId === core.id;
  if (params.redirectIfSelfToProfile && isMe) {
    redirect("/profile");
  }

  // 4) 개인화(비캐시): viewer→target 단건 관계
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

  // 5) email: 본인일 때만 비캐시로 조회
  const email = isMe ? await getMyEmail(core.id) : null;

  // 6) 반환 (MyProfile/UserProfile 컴포넌트 공용 형태)
  const result: UserProfile = {
    id: core.id,
    username: core.username,
    avatar: core.avatar ?? null,
    email, // isMe만 채워짐
    created_at: core.created_at,
    emailVerified: core.emailVerified,
    _count: { followers: counts.followers, following: counts.following },
    isMe,
    isFollowing,
    viewerId,
  };

  return result;
}
