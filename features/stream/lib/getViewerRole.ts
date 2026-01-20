/**
 * File Name : features/stream/lib/getViewerRole.ts
 * Description : 채널 뷰어 역할 계산
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.09  임도헌   Created   OWNER/FOLLOWER/VISITOR 판별
 * 2026.01.19  임도헌   Moved     lib/stream -> features/stream/lib
 */
import db from "@/lib/db";
import type { ViewerRole } from "@/types/stream";

export async function getViewerRole(
  viewerId: number | null,
  ownerId: number
): Promise<ViewerRole> {
  if (!viewerId) return "VISITOR";
  if (viewerId === ownerId) return "OWNER";

  const rel = await db.follow.findUnique({
    where: {
      followerId_followingId: { followerId: viewerId, followingId: ownerId },
    },
    select: { followerId: true },
  });
  return rel ? "FOLLOWER" : "VISITOR";
}
