/**
 * File Name : features/review/actions/delete.ts
 * Description : 리뷰 삭제 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   Action 통합 및 Service 호출
 * 2026.01.30  임도헌   Moved     features/review/actions.ts -> features/review/actions/delete.ts
 */
"use server";

import { revalidateTag } from "next/cache";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";
import {
  deleteReviewService,
  deleteAllReviewsService,
} from "@/features/review/service/delete";
import { REVIEW_ERRORS } from "@/features/review/constants";
import type { DeleteReviewResult } from "@/features/review/types";

/**
 * 단일 리뷰 삭제 Action
 * - 로그인 세션을 확인합니다.
 * - Service를 호출하여 리뷰를 삭제합니다. (권한 검증 포함)
 * - 삭제 성공 시 제품 상세 및 유저 평점/리뷰 목록 캐시를 무효화합니다.
 *
 * @param reviewId - 삭제할 리뷰 ID
 * @returns 삭제 결과
 */
export async function deleteReviewAction(
  reviewId: number
): Promise<DeleteReviewResult> {
  const session = await getSession();
  if (!session?.id)
    return { success: false, error: REVIEW_ERRORS.NOT_LOGGED_IN };

  const result = await deleteReviewService(session.id, reviewId);

  if (result.success && result.meta) {
    const { productId, productOwnerId } = result.meta;
    revalidateTag(T.PRODUCT_DETAIL_ID(productId));

    if (productOwnerId) {
      revalidateTag(T.USER_AVERAGE_RATING_ID(productOwnerId));
      revalidateTag(T.USER_REVIEWS_INITIAL_ID(productOwnerId));
    }
  }

  return result;
}

/**
 * 제품의 모든 리뷰 삭제 Action (상태 변경 시 호출)
 * - 판매자가 제품 상태를 '판매 완료'에서 '판매 중'으로 되돌릴 때 사용됩니다.
 * - 해당 제품에 달린 모든 리뷰를 삭제하고 관련 캐시를 갱신합니다.
 *
 * @param productId - 제품 ID
 * @returns 삭제 결과
 */
export async function deleteAllProductReviewsAction(
  productId: number
): Promise<DeleteReviewResult> {
  const session = await getSession();
  if (!session?.id)
    return { success: false, error: REVIEW_ERRORS.NOT_LOGGED_IN };

  const result = await deleteAllReviewsService(session.id, productId);

  if (result.success && result.meta) {
    const { productOwnerId } = result.meta;
    revalidateTag(T.PRODUCT_DETAIL_ID(productId));

    if (productOwnerId) {
      revalidateTag(T.USER_AVERAGE_RATING_ID(productOwnerId));
      revalidateTag(T.USER_REVIEWS_INITIAL_ID(productOwnerId));
    }
  }

  return result;
}
