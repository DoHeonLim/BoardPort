/**
 * File Name : features/user/actions/review.ts
 * Description : 유저 리뷰 조회 Controller (Client용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   Client Hook용 Server Action 생성
 */
"use server";

import { getMoreUserReviews } from "@/features/user/service/review";
import type { ReviewCursor } from "@/features/user/types";

/**
 * 유저 리뷰 추가 로드 Action
 * - 클라이언트 무한 스크롤(`useReviewPagination`)에서 호출됩니다.
 *
 * @param targetUserId - 리뷰 대상 유저 ID
 * @param cursor - 키셋 페이징 커서 (createdAt, id)
 */
export async function getMoreUserReviewsAction(
  targetUserId: number,
  cursor: ReviewCursor,
  limit = 10
) {
  return await getMoreUserReviews(targetUserId, cursor, limit);
}
