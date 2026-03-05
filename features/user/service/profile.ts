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
 * 2026.02.04  임도헌   Modified  차단 관계 확인 로직 추가
 * 2026.02.15  임도헌   Modified  updateUserLocationAction 추가
 * 2026.02.15  임도헌   Modified  유저 조회 시 locationName, region2 포함
 * 2026.03.03  임도헌   Modified  unstable_cache 래퍼 전면 제거 및 단일 순수 함수로 통합 (TanStack Query 이관)
 */

import "server-only";

import db from "@/lib/db";
import { checkBlockRelation } from "@/features/user/service/block";
import { normalizeUsername } from "@/features/user/utils/normalize";
import type { ServiceResult } from "@/lib/types";
import type { UserProfile, UserLite } from "@/features/user/types";
import type { LocationData } from "@/features/map/types";
import type { RegionRange } from "@/generated/prisma/enums";

// -----------------------------------------------------------------------------
// 1. Internal Cached Helpers
// -----------------------------------------------------------------------------

/**
 * username을 userId로 변환
 */
export async function resolveUserIdByUsername(
  rawUsername: string
): Promise<number | null> {
  const uname = normalizeUsername(rawUsername);
  if (!uname) return null;

  const u = await db.user.findUnique({
    where: { username: uname },
    select: { id: true },
  });

  return u?.id ?? null;
}

// -----------------------------------------------------------------------------
// 2. Public API
// -----------------------------------------------------------------------------

/**
 * 프로필 페이지 상세 정보 조회 로직
 *
 * [데이터 가공 전략]
 * - 유저의 핵심 정보 및 팔로우 카운트 병렬 조회
 * - 조회자(`viewerId`)와 타겟 유저 간의 차단/팔로우 관계 상태 매핑 처리
 *
 * @param {number | null} targetId - 조회할 대상 유저 ID
 * @param {number | null} viewerId - 조회자 ID
 * @returns {Promise<UserProfile | null>} 상태 매핑된 프로필 객체 반환
 */
export async function getUserProfile(
  targetId: number | null,
  viewerId: number | null
): Promise<UserProfile | null> {
  if (!targetId) return null;

  // Core 정보와 카운트 정보를 병렬 조회
  const [core, followerCount, followingCount] = await Promise.all([
    db.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        username: true,
        avatar: true,
        created_at: true,
        emailVerified: true,
        locationName: true,
        region1: true,
        region2: true,
        region3: true,
        regionRange: true,
      },
    }),
    db.follow.count({ where: { followingId: targetId } }),
    db.follow.count({ where: { followerId: targetId } }),
  ]);

  if (!core) return null;

  const isMe = !!viewerId && viewerId === core.id;

  let email: string | null = null;
  if (isMe) {
    const me = await db.user.findUnique({
      where: { id: core.id },
      select: { email: true },
    });
    email = me?.email ?? null;
  }

  let isFollowing = false;
  let isBlocked = false;

  if (viewerId && !isMe) {
    const [followRel, blockStatus] = await Promise.all([
      db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: viewerId,
            followingId: core.id,
          },
        },
        select: { id: true },
      }),
      checkBlockRelation(viewerId, core.id),
    ]);

    isFollowing = !!followRel;
    isBlocked = blockStatus;
  }

  return {
    id: core.id,
    username: core.username,
    avatar: core.avatar ?? null,
    email,
    created_at: core.created_at,
    emailVerified: core.emailVerified,
    locationName: core.locationName,
    region1: core.region1,
    region2: core.region2,
    region3: core.region3,
    _count: { followers: followerCount, following: followingCount },
    isMe,
    isFollowing,
    isBlocked,
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
 * 유저 위치 정보 업데이트 로직
 *
 * [데이터 가공 및 캐시 제어 전략]
 * - Partial 타입 입력을 통한 위치 데이터(region/latitude/longitude 등) 선택적 업데이트
 * - 위치 정보 변경 시 전체 목록 페이지(`products`, `posts`, `profile`) 리밸리데이션(Revalidate) 유도
 *
 * @param {number} userId - 대상 유저 ID
 * @param {Partial<LocationData>} location - 업데이트할 위치 데이터 조각
 */
export async function getUserLocation(userId: number) {
  const core = await db.user.findUnique({
    where: { id: userId },
    select: {
      locationName: true,
      region1: true,
      region2: true,
      region3: true,
      regionRange: true,
    },
  });

  if (!core) return null;

  return {
    locationName: core.locationName,
    region1: core.region1,
    region2: core.region2,
    region3: core.region3,
    regionRange: core.regionRange as "DONG" | "GU" | "CITY" | "ALL",
  };
}

/**
 * 방송국용 경량 정보 조회 (채널 페이지)
 * - username 기반으로 기본 정보와 팔로우 통계만 빠르게 조회
 */
export async function getUserChannel(username: string) {
  const uname = normalizeUsername(username);

  return await db.user.findUnique({
    where: { username: uname },
    select: {
      id: true,
      username: true,
      avatar: true,
      created_at: true,
      _count: { select: { followers: true, following: true } },
    },
  });
}

/**
 * 유저의 활동 지역(내 동네) 정보 또는 노출 범위(Range)를 업데이트
 *
 * [Logic]
 * - Partial<LocationData>를 사용하여 전달된 필드만 선택적으로 업데이트합
 * - 지도를 통해 전체를 바꿀 때는 모든 필드가 들어오고,
 *   상단 토글로 범위만 바꿀 때는 regionRange만 들어옴
 * - Prisma의 특성상 undefined 필드는 업데이트에서 제외
 *
 * @param {number} userId - 대상 유저 ID
 * @param {Partial<LocationData>} location - 업데이트할 위치 데이터 조각
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function updateUserLocation(
  userId: number,
  location: Partial<LocationData>
): Promise<ServiceResult> {
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        ...(location.latitude !== undefined && { latitude: location.latitude }),
        ...(location.longitude !== undefined && {
          longitude: location.longitude,
        }),
        ...(location.locationName !== undefined && {
          locationName: location.locationName,
        }),
        ...(location.region1 !== undefined && { region1: location.region1 }),
        ...(location.region2 !== undefined && { region2: location.region2 }),
        ...(location.region3 !== undefined && { region3: location.region3 }),
        ...(location.regionRange && {
          regionRange: location.regionRange as RegionRange,
        }),
      },
    });
    return { success: true };
  } catch (error) {
    console.error("updateUserLocation error:", error);
    return { success: false, error: "위치 저장 중 오류가 발생했습니다." };
  }
}
