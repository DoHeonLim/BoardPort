/**
 * File Name : features/post/service/comment.ts
 * Description : 댓글 관리 비즈니스 로직 (조회, 생성, 삭제)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.07.06  임도헌   Created
 * 2025.11.20  임도헌   Modified  revalidate 태그 네이밍 통일
 * 2025.12.07  임도헌   Modified  댓글 관련 뱃지 체크 정리(onCommentCreate + 이벤트트)
 * 2026.01.03  임도헌   Modified  댓글 작성 후 POST_COMMENTS + POST_DETAIL + POST_LIST 무효화로 댓글/카운트 즉시 동기화
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 * 2026.01.22  임도헌   Merged    lib/createComment.ts 기반 통합 및 Session 의존성 제거
 * 2026.01.27  임도헌   Modified  주석 보강
 */
"use server";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { badgeChecks } from "@/features/user/service/badge";
import type { PostComment } from "@/features/post/types";
import type { ServiceResult } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*                                 Read Logic                                 */
/* -------------------------------------------------------------------------- */

const getCommentsRaw = async (
  postId: number,
  cursor?: number | undefined,
  limit = 10
): Promise<PostComment[]> => {
  const comments = await db.comment.findMany({
    where: { postId },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      payload: true,
      created_at: true,
      userId: true,
      user: {
        select: { username: true, avatar: true },
      },
    },
  });
  return comments as unknown as PostComment[];
};

/**
 * 초기 댓글 목록 조회 (Cached)
 * - 첫 페이지 로딩 시 사용되며 캐싱됩니다.
 * - 태그: POST_COMMENTS(postId)
 *
 * @param {number} postId - 게시글 ID
 */
export const getCachedComments = (postId: number) => {
  return nextCache(
    () => getCommentsRaw(postId),
    ["post-comments", String(postId)],
    { tags: [T.POST_COMMENTS(postId)] }
  )();
};

/**
 * 추가 댓글 로드 (Non-Cached)
 * - 무한 스크롤 시 커서 기반으로 조회합니다.
 *
 * @param {number} postId - 게시글 ID
 * @param {number} [cursor] - 마지막 댓글 ID
 */
export const getMoreComments = (
  postId: number,
  cursor?: number | undefined,
  limit = 10
) => {
  return getCommentsRaw(postId, cursor, limit);
};

/* -------------------------------------------------------------------------- */
/*                                Write Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 댓글 생성
 * - 댓글 저장 후 뱃지 체크를 수행합니다.
 *
 * @param {number} userId - 작성자 ID
 * @param {number} postId - 게시글 ID
 * @param {string} payload - 댓글 내용
 */
export async function createComment(
  userId: number,
  postId: number,
  payload: string
): Promise<ServiceResult<{ id: number }>> {
  try {
    const comment = await db.comment.create({
      data: {
        payload,
        postId,
        userId,
      },
    });

    // 뱃지 체크
    await Promise.allSettled([
      badgeChecks.onCommentCreate(userId),
      badgeChecks.onEventParticipation(userId),
    ]);

    return { success: true, data: { id: comment.id } };
  } catch (e) {
    console.error("createComment failed:", e);
    return { success: false, error: "댓글 작성 실패" };
  }
}

/**
 * 댓글 삭제
 * - 작성자 권한을 확인하고 삭제합니다.
 *
 * @param {number} userId - 요청자 ID
 * @param {number} commentId - 삭제할 댓글 ID
 */
export async function deleteComment(
  userId: number,
  commentId: number
): Promise<ServiceResult> {
  try {
    const comment = await db.comment.findUnique({
      where: { id: commentId },
      select: { userId: true },
    });

    if (!comment) return { success: false, error: "댓글을 찾을 수 없습니다." };
    if (comment.userId !== userId)
      return { success: false, error: "권한이 없습니다." };

    await db.comment.delete({ where: { id: commentId } });
    return { success: true };
  } catch (e) {
    console.error("deleteComment failed:", e);
    return { success: false, error: "댓글 삭제 실패" };
  }
}
