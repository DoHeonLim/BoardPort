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
 * 2026.03.04  임도헌   Modified  unstable_cache 래퍼 제거 및 단일 함수로 통일
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

import "server-only";
import db from "@/lib/db";
import {
  checkBoardExplorerBadge,
  checkPopularWriterBadge,
} from "@/features/user/service/badge";
import { checkBlockRelation } from "@/features/user/service/block";
import { isUniqueConstraintError } from "@/lib/errors";
import type { ServiceResult } from "@/lib/types";

/**
 * 게시글 좋아요 상태 및 총 개수 조회 로직
 *
 * [데이터 가공 전략]
 * - 게시글의 총 좋아요 개수 카운트 및 현재 유저의 좋아요 여부 병렬 조회
 * - 비로그인(null) 사용자일 경우 좋아요 상태를 false로 반환
 *
 * @param {number} postId - 게시글 ID
 * @param {number | null} userId - 조회 유저 ID
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
 * 게시글 좋아요 상태 토글 로직
 *
 * [데이터 가공 및 상호작용 전략]
 * - 게시글 작성자와의 양방향 차단 관계 검증 후 차단 시 액션 차단
 * - 좋아요 추가(Create) 또는 취소(Delete) 로직 수행
 * - 좋아요 추가 시 작성자에 대한 관련 뱃지 부여 로직 병렬 실행
 * - 동시성 이슈 및 멱등성 보장을 위한 예외(P2025 등) 무시 처리
 *
 * @param {number} userId - 유저 ID
 * @param {number} postId - 게시글 ID
 * @param {boolean} isLike - true(좋아요 추가), false(좋아요 취소)
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
