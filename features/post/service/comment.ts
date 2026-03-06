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
 * 2026.02.05  임도헌   Modified  댓글 작성 시 게시글 작성자와의 차단 관계 검증 추가
 * 2026.02.07  임도헌   Modified  정지 유저 가드(validateUserStatus) 적용
 * 2026.02.23  임도헌   Modified  댓글 조회 시 정지유저(Banned) 콘텐츠 완벽 은닉 처리
 * 2026.03.04  임도헌   Modified  unstable_cache 래퍼 제거 및 단일 조회 함수(getPostCommentsList)로 통합
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
import "server-only";
import db from "@/lib/db";
import { badgeChecks } from "@/features/user/service/badge";
import {
  getBlockedUserIds,
  checkBlockRelation,
} from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";
import { Prisma } from "@/generated/prisma/client";
import type { PostComment } from "@/features/post/types";
import type { ServiceResult } from "@/lib/types";

/* -------------------------------------------------------------------------- */
/*                                 Read Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 게시글 댓글 목록 조회 로직
 *
 * [데이터 가공 및 캐시 제어 전략]
 * - 커서 기반의 페이징 쿼리 적용 및 작성자 정보(UserLite) 조인 반환
 * - 조회자 ID(viewerId)를 기반으로 차단 유저의 댓글 필터링 적용
 * - 정지 유저(bannedAt) 콘텐츠 은닉 처리
 *
 * @param {number} postId - 게시글 ID
 * @param {number | undefined} cursor - 페이징 커서 (마지막 댓글 ID)
 * @param {number} limit - 조회할 최대 개수
 * @param {number | null} viewerId - 조회자 ID
 */
export async function getPostCommentsList(
  postId: number,
  cursor?: number | undefined,
  limit: number = 10,
  viewerId?: number | null
): Promise<PostComment[]> {
  const where: Prisma.CommentWhereInput = {
    postId,
    user: { bannedAt: null },
  };

  //차단 유저 댓글 제외
  if (viewerId) {
    const blockedIds = await getBlockedUserIds(viewerId);
    if (blockedIds.length > 0) {
      where.userId = { notIn: blockedIds };
    }
  }

  const comments = await db.comment.findMany({
    where,
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
}

/* -------------------------------------------------------------------------- */
/*                                Write Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 게시글 댓글 생성 로직
 *
 * [데이터 가공 및 캐시 제어 전략]
 * - 작성자의 이용 정지 상태 검증 및 비인가 처리
 * - 게시글 소유자와의 차단 관계 검증을 통한 상호작용 차단
 * - 댓글 DB 저장 후 관련된 뱃지 획득 조건 비동기 검사 수행
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
    // 정지 유저 체크
    const status = await validateUserStatus(userId);
    if (!status.success) return status;

    // 게시글 작성자 식별 및 차단 확인
    const post = await db.post.findUnique({
      where: { id: postId },
      select: { userId: true },
    });
    if (!post) return { success: false, error: "게시글을 찾을 수 없습니다." };

    const isBlocked = await checkBlockRelation(userId, post.userId);
    if (isBlocked) {
      return {
        success: false,
        error: "차단된 사용자와는 상호작용할 수 없습니다.",
      };
    }

    // 댓글 생성
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
 * 게시글 댓글 삭제 로직
 *
 * [데이터 가공 및 권한 제어 전략]
 * - 댓글 정보 조회 및 요청자와의 소유권 비교를 통한 권한 검증
 * - 해당 댓글 데이터의 물리적 삭제(Hard Delete) 처리
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
