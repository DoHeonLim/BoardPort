/**
 * File Name : features/review/types.ts
 * Description : 리뷰 도메인 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   Service/Action 공용 타입
 * 2026.01.24  임도헌   Modified  ProductReview, ReviewSubmitResult 추가
 * 2026.02.22  임도헌   Modified  ReviewServiceResult에 캐시 무효화용 meta 추가
 */

// =============================================================================
// 1. Service Layer Types (비즈니스 로직 결과)
// =============================================================================

/**
 * 리뷰 생성 서비스 결과
 * - 생성 성공 시, 캐시 무효화를 위한 메타데이터(productId, sellerId, buyerId)를 반환
 */
export type ReviewServiceResult =
  | {
      success: true;
      review: ProductReview;
      meta?: { productId: number; sellerId: number; buyerId: number | null };
    }
  | { success: false; error: string };

/**
 * 리뷰 삭제 서비스 결과
 * - 삭제 성공 시, 캐시 무효화를 위한 메타데이터(productId, sellerId, buyerId)를 반환
 */
export type DeleteReviewResult =
  | {
      success: true;
      meta?: { productId: number; sellerId?: number; buyerId?: number };
    }
  | { success: false; error: string };

// =============================================================================
// 2. Entity / Model Types (DB 모델)
// =============================================================================

/**
 * 리뷰 핵심 데이터 모델
 * - DB 조회 결과 매핑 및 클라이언트 UI 렌더링에 사용
 */
export interface ProductReview {
  id: number;
  userId: number;
  productId: number;
  payload: string;
  rate: number;
  created_at: Date; // 필수 필드로 변경
}

// =============================================================================
// 3. Client Layer Types (Hook/Component)
// =============================================================================

/**
 * useReview 훅의 리뷰 작성 결과 타입
 */
export type ReviewSubmitResult =
  | { ok: true; review: ProductReview }
  | { ok: false; error: string };
