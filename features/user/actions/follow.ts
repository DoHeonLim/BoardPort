/**
 * File Name : features/user/actions/follow.ts
 * Description : 팔로우 토글 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   API Route 대체
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  followUserService,
  unfollowUserService,
  getFollowersService,
  getFollowingService,
} from "@/features/user/service/follow";
import type { FollowListCursor } from "@/features/user/types";
import { USER_ERRORS } from "@/features/user/constants";

export type FollowActionResult =
  | {
      success: true;
      changed: boolean;
      isFollowing: boolean;
      delta: number;
      counts: { viewerFollowing: number; targetFollowers: number };
    }
  | { success: false; error: string; code?: string };

/**
 * 팔로워 목록 조회 (Client Infinite Scroll용)
 */
export async function getFollowersAction(
  username: string,
  cursor: FollowListCursor
) {
  const session = await getSession();
  const viewerId = session?.id ?? null;
  // Service 호출 (페이징 및 viewer 관계 확인)
  return await getFollowersService(username, viewerId, cursor);
}

/**
 * 팔로잉 목록 조회 (Client Infinite Scroll용)
 */
export async function getFollowingAction(
  username: string,
  cursor: FollowListCursor
) {
  const session = await getSession();
  const viewerId = session?.id ?? null;
  return await getFollowingService(username, viewerId, cursor);
}

/**
 * 팔로우/언팔로우 토글 Action
 *
 * 1. 로그인 및 자기 자신 팔로우 여부 확인
 * 2. Service 호출 (DB 반영 및 멱등성 처리)
 * 3. 성공 시(변경 발생 시) 관련 캐시 태그 무효화
 */
export async function toggleFollowAction(
  targetId: number,
  intent: "follow" | "unfollow"
): Promise<FollowActionResult> {
  const session = await getSession();
  if (!session?.id) {
    return {
      success: false,
      error: USER_ERRORS.NOT_LOGGED_IN,
      code: "UNAUTHORIZED",
    };
  }

  const viewerId = session.id;

  if (viewerId === targetId) {
    return { success: false, error: "자신을 팔로우할 수 없습니다." };
  }

  // 1. Service 호출
  const result =
    intent === "follow"
      ? await followUserService(viewerId, targetId)
      : await unfollowUserService(viewerId, targetId);

  // 2. 캐시 무효화 (실제 변경이 있을 때만)
  if (result.changed) {
    revalidateTag(T.USER_FOLLOWING_ID(viewerId)); // 내 팔로잉 목록/수
    revalidateTag(T.USER_FOLLOWERS_ID(targetId)); // 상대방 팔로워 목록/수
  }

  return {
    success: true,
    changed: result.changed,
    isFollowing: result.isFollowing,
    delta: result.changed ? (intent === "follow" ? 1 : -1) : 0,
    counts: result.counts,
  };
}
