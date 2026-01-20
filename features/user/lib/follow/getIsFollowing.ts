/**
 * File Name : features/user/lib/follow/getIsFollowing.ts
 * Description : viewer가 특정 사용자를 팔로우 중인지 여부 반환
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.05.26  임도헌   Created    app/(tabs)/profile/[username]/actions에 getIsFollowing 추가
 * 2025.05.26  임도헌   Modified   자기 자신 비교 시 true 처리(UX 단순화)
 * 2025.10.08  임도헌   Moved      lib/user/follow/getIsFollowing로 분리(server-only)
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 */

import "server-only";
import db from "@/lib/db";

export async function getIsFollowing(
  followerId: number,
  followingId: number
): Promise<boolean> {
  if (!followerId || !followingId) return false;
  if (followerId === followingId) return true; // 자기 자신은 true 처리(UX 단순화)
  const follow = await db.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
    select: { followerId: true },
  });
  return !!follow;
}
