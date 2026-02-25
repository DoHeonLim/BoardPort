/**
 * File Name : features/post/service/like.ts
 * Description : 게시글 좋아요 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.22  임도헌   Created   app/posts/[id]/actions/likes.ts에서 service관련 로직 분리
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.02.05  임도헌   Modified  좋아요 시 게시글 작성자와의 차단 관계 검증 추가
 * 2026.02.23  임도헌   Modified  좋아요 뱃지 체크 비동기 병렬화(Promise.allSettled)로 응답 속도 최적화
 */

import "server-only";
import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  checkBoardExplorerBadge,
  checkPopularWriterBadge,
} from "@/features/user/service/badge";
import { checkBlockRelation } from "@/features/user/service/block";
import { isUniqueConstraintError } from "@/lib/errors";
import type { ServiceResult } from "@/lib/types";

/**
 * 좋아요 상태 및 총 개수 조회 (Internal)
 */
export async function getPostLikeStatus(postId: number, userId: number | null) {
  const [likeCount, likedRow] = await Promise.all([
    db.postLike.count({ where: { postId } }),
    userId
      ? db.postLike.findUnique({
          where: { id: { postId, userId } },
        })
      : Promise.resolve(null),
  ]);

  return { likeCount, isLiked: !!likedRow };
}

/**
 * 좋아요 상태 캐시 (User ID 포함)
 * - userId가 null(비로그인)이면 isLiked는 항상 false
 * - 태그: POST_LIKE_STATUS(postId)
 *
 * @param {number} postId - 게시글 ID
 * @param {number | null} userId - 유저 ID
 */
export const getCachedPostLikeStatus = (
  postId: number,
  userId: number | null
) => {
  return nextCache(
    async (pid, uid) => getPostLikeStatus(pid, uid),
    ["post-like-status", String(postId), String(userId)],
    { tags: [T.POST_LIKE_STATUS(postId)] }
  )(postId, userId);
};

/**
 * 좋아요 토글
 * - 좋아요 추가 시 작성자 뱃지 체크를 수행
 *
 * @param {number} userId - 유저 ID
 * @param {number} postId - 게시글 ID
 * @param {boolean} isLike - true: 좋아요, false: 취소
 */
export async function togglePostLike(
  userId: number,
  postId: number,
  isLike: boolean
): Promise<ServiceResult> {
  // post 소유자 확인 (뱃지 체크용)
  const post = await db.post.findUnique({
    where: { id: postId },
    select: { userId: true },
  });
  if (!post) return { success: false, error: "Post not found" };

  // 차단 확인
  const isBlocked = await checkBlockRelation(userId, post.userId);
  if (isBlocked) {
    return { success: false, error: "권한이 없습니다." };
  }

  try {
    if (isLike) {
      await db.postLike.create({
        data: { postId, userId },
      });
      // 좋아요 받은 사람(글쓴이) 뱃지 체크(병렬 처리)
      await Promise.allSettled([
        checkPopularWriterBadge(post.userId),
        checkBoardExplorerBadge(post.userId),
      ]);
    } else {
      await db.postLike.delete({
        where: { id: { postId, userId } },
      });
    }
    return { success: true };
  } catch (e) {
    // 이미 좋아요/삭제됨 (멱등)
    if (isUniqueConstraintError(e) || (e as any).code === "P2025") {
      return { success: true };
    }
    console.error("togglePostLike failed:", e);
    return { success: false, error: "Failed to toggle like" };
  }
}
