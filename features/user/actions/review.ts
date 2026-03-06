/**
 * File Name : features/user/actions/review.ts
 * Description : 유저 리뷰 조회 Controller (Client용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   Client Hook용 Server Action 생성
 * 2026.02.05  임도헌   Modified  리뷰 조회 시 viewerId 전달
 * 2026.03.05  임도헌   Modified  초기 로딩 및 추가 페이징 액션을 단일화(`getUserReviewsAction`)하여 TanStack Query 구조와 정합성 확보
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use server";

import getSession from "@/lib/session";
import { getUserReviews } from "@/features/user/service/review";
import type { ReviewCursor } from "@/features/user/types";

/**
 * 유저 리뷰 목록 조회 Server Action
 *
 * [데이터 페칭 및 권한 제어]
 * - 로그인 세션 확인 및 Service 계층 호출
 * - 타겟 유저(`targetUserId`)에 대해 조회자가 차단한 유저의 댓글 필터링 적용
 *
 * @param {number} targetUserId - 리뷰 대상 유저 ID
 * @param {ReviewCursor | null} [cursor] - 페이징 커서
 * @param {number} limit - 페이지당 로드 개수
 */
export async function getUserReviewsAction(
  targetUserId: number,
  cursor: ReviewCursor | null = null,
  limit = 10
) {
  const session = await getSession();
  const viewerId = session?.id ?? null;
  return await getUserReviews(targetUserId, cursor, limit, viewerId);
}
