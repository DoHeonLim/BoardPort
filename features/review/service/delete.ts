/**
 * File Name : features/review/service/delete.ts
 * Description : 리뷰 삭제 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.17  임도헌   Moved      lib/review/deleteReview로 이동(server-only) + 기존 revalidateTag 정책 유지
 * 2025.11.05  임도헌   Modified   세션 기반 권한(작성자/상품소유자) 검증 추가
 * 2025.11.19  임도헌   Modified   리뷰 삭제 시 판매자 평균 평점, 리뷰 목록 및 해당 제품 상세 최신화
 * 2026.01.19  임도헌   Moved      lib/review -> features/review/lib
 * 2026.01.24  임도헌   Merged     lib/deleteReview & deleteAllProductReviews 통합
 */

import "server-only";
import db from "@/lib/db";
import { REVIEW_ERRORS } from "@/features/review/constants";
import { DeleteReviewResult } from "@/features/review/types";

/**
 * 단일 리뷰 삭제
 * - 작성자 또는 제품 소유자(판매자)만 삭제할 수 있습니다.
 *
 * @param userId - 요청자 ID
 * @param reviewId - 삭제할 리뷰 ID
 * @returns 성공 여부 및 메타데이터(캐시 무효화용)
 */
export async function deleteReviewService(
  userId: number,
  reviewId: number
): Promise<DeleteReviewResult> {
  try {
    // 1. 리뷰 및 관련 제품 정보 조회
    const rev = await db.review.findUnique({
      where: { id: reviewId },
      select: {
        userId: true, // 작성자
        productId: true,
        product: { select: { userId: true, id: true } }, // 판매자(상품 주인)
      },
    });

    if (!rev) return { success: false, error: "리뷰를 찾을 수 없습니다." };

    // 2. 권한 검증
    const isAuthor = rev.userId === userId;
    const isProductOwner = rev.product?.userId === userId;

    // 작성자도 아니고, 상품 주인도 아니라면 삭제 불가
    if (!isAuthor && !isProductOwner) {
      return { success: false, error: REVIEW_ERRORS.UNAUTHORIZED };
    }

    // 3. 삭제 실행
    await db.review.delete({ where: { id: reviewId } });

    // 4. 메타데이터 반환 (호출부에서 캐시 무효화 수행)
    return {
      success: true,
      meta: {
        productId: rev.productId,
        productOwnerId: rev.product?.userId,
      },
    };
  } catch (error) {
    console.error("[ReviewService] Delete Error:", error);
    return { success: false, error: REVIEW_ERRORS.SERVER_ERROR };
  }
}

/**
 * 특정 제품의 모든 리뷰 삭제
 * - 제품 상태 변경(판매중 복귀) 시 관련 리뷰를 일괄 삭제합니다.
 * - 제품 소유자만 수행할 수 있습니다.
 *
 * @param userId - 요청자 ID
 * @param productId - 제품 ID
 * @returns 성공 여부 및 메타데이터
 */
export async function deleteAllReviewsService(
  userId: number,
  productId: number
): Promise<DeleteReviewResult> {
  try {
    // 1. 제품 소유권 확인
    const prod = await db.product.findUnique({
      where: { id: productId },
      select: { userId: true },
    });

    if (!prod)
      return { success: false, error: REVIEW_ERRORS.PRODUCT_NOT_FOUND };

    if (prod.userId !== userId) {
      return { success: false, error: REVIEW_ERRORS.UNAUTHORIZED };
    }

    // 2. 일괄 삭제 실행
    await db.review.deleteMany({ where: { productId } });

    return {
      success: true,
      meta: {
        productId,
        productOwnerId: prod.userId,
      },
    };
  } catch (error) {
    console.error("[ReviewService] DeleteAll Error:", error);
    return { success: false, error: REVIEW_ERRORS.SERVER_ERROR };
  }
}
