/**
 * File Name : features/stream/actions/like.ts
 * Description : 녹화본 좋아요 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.04  임도헌   Created   녹화본 좋아요 기능 구현 (legacy liveStream)
 * 2025.09.06  임도헌   Modified  unstable_cache/revalidateTag 제거, 멱등/경합 내성 유지
 * 2025.09.10  임도헌   Modified  like/dislike가 즉시 isLiked/likeCount 반환 (클라 1회왕복)
 * 2025.09.20  임도헌   Modified  VodAsset 단위로 전환 (RecordingLike: @@id([userId, vodId]))
 * 2025.12.22  임도헌   Modified  Prisma 에러 가드 유틸로 변경
 * 2026.01.23  임도헌   Modified  Service(like.ts) 연동 및 Controller 역할 정립
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/streams/[id]/recording/actions/likes.ts -> features/stream/actions/like.ts
 */
"use server";

import getSession from "@/lib/session";
import {
  getRecordingLikeStatus as getStatusService,
  toggleRecordingLike,
} from "@/features/stream/service/like";

/**
 * 현재 VodAsset에 대한 좋아요 상태/개수 조회 Action
 */
export async function getRecordingLikeStatus(
  vodId: number,
  userId: number | null
) {
  return getStatusService(vodId, userId);
}

type LikeResult =
  | { success: true; isLiked: boolean; likeCount: number }
  | { success: false; error: string };

/**
 * 좋아요 추가 Action
 */
export async function likeRecording(vodId: number): Promise<LikeResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

  try {
    const { likeCount } = await toggleRecordingLike(vodId, session.id, true);
    return { success: true, isLiked: true, likeCount };
  } catch (e) {
    console.error("likeRecording error:", e);
    return { success: false, error: "FAILED" };
  }
}

/**
 * 좋아요 취소 Action
 */
export async function dislikeRecording(vodId: number): Promise<LikeResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

  try {
    const { likeCount } = await toggleRecordingLike(vodId, session.id, false);
    return { success: true, isLiked: false, likeCount };
  } catch (e) {
    console.error("dislikeRecording error:", e);
    return { success: false, error: "FAILED" };
  }
}
