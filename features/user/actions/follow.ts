/**
 * File Name : features/user/actions/follow.ts
 * Description : 팔로우 토글 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   API Route 대체
 * 2026.03.05  임도헌   Modified  서버 캐시 무효화(`revalidateTag`) 방식 탈피, `queryClient.setQueryData`를 활용한 즉각적 UI 갱신(Optimistic Update) 적용
 * 2026.03.07  임도헌   Modified  팔로우 실패 사유를 구조화된 결과로 반환하도록 보강
 */
"use server";

import getSession from "@/lib/session";
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

  let result;
  try {
    result =
      intent === "follow"
        ? await followUserService(viewerId, targetId)
        : await unfollowUserService(viewerId, targetId);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "팔로우 처리에 실패했습니다. 잠시 후 다시 시도해주세요.";

    let code: string | undefined;
    if (message.includes("정지")) code = "BANNED_USER";
    else if (message.includes("차단")) code = "FORBIDDEN";

    return { success: false, error: message, code };
  }

  return {
    success: true,
    changed: result.changed,
    isFollowing: result.isFollowing,
    delta: result.changed ? (intent === "follow" ? 1 : -1) : 0,
    counts: result.counts,
  };
}
