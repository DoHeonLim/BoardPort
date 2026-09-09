/**
 * File Name : features/review/actions/delete.ts
 * Description : 리뷰 삭제 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   Action 통합 및 Service 호출
 * 2026.01.30  임도헌   Moved     features/review/actions.ts -> features/review/actions/delete.ts
 * 2026.03.05  임도헌   Modified  레거시 `revalidateTag` 파편화 코드 제거 및 `invalidateQueries`를 활용한 클라이언트 캐시 무효화로 대체
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.05.16  임도헌   Modified  현재 actions 계층 역할에 맞게 파일 설명 정리
 * 2026.08.23  임도헌   Modified  Next.js 16 revalidateTag 만료 프로필 인자 반영
 * 2026.09.09  임도헌   Removed   별도 리뷰 Query와 무관한 상품 상세 본문 태그 만료 제거
 */
"use server";

import getSession from "@/lib/session";
import {
  deleteReviewService,
  deleteAllReviewsService,
} from "@/features/review/service/delete";
import { REVIEW_ERRORS } from "@/features/review/constants";
import type { DeleteReviewResult } from "@/features/review/types";

/**
 * 단일 리뷰 삭제 Server Action
 *
 * [데이터 가공 및 캐시 제어 로직]
 * - 로그인 세션 확인 후 Service 계층을 호출하여 리뷰 물리적 삭제(Hard Delete) 처리
 * - 요청 유저가 작성자 본인인지에 대한 권한 검증 포함
 * - 리뷰 목록 갱신은 호출 클라이언트의 Query cache에서 처리
 *
 * @param {number} reviewId - 삭제할 리뷰 ID
 * @returns {Promise<DeleteReviewResult>} 삭제 결과 객체 반환
 */
export async function deleteReviewAction(
  reviewId: number
): Promise<DeleteReviewResult> {
  const session = await getSession();
  if (!session?.id)
    return { success: false, error: REVIEW_ERRORS.NOT_LOGGED_IN };

  const result = await deleteReviewService(session.id, reviewId);

  return result;
}

/**
 * 특정 상품 연결 리뷰 일괄 삭제 Server Action
 *
 * [데이터 가공 및 캐시 제어 로직]
 * - 판매자의 거래 완료 취소와 판매 중 상태 복귀에 사용
 * - 로그인 세션 확인 및 상품 소유자(판매자) 권한 검증 절차 수행
 * - 연관된 모든 리뷰 레코드 일괄 삭제
 *
 * @param {number} productId - 리뷰를 초기화할 대상 상품 ID
 * @returns {Promise<DeleteReviewResult>} 삭제 결과 객체 반환
 */
export async function deleteAllProductReviewsAction(
  productId: number
): Promise<DeleteReviewResult> {
  const session = await getSession();
  if (!session?.id)
    return { success: false, error: REVIEW_ERRORS.NOT_LOGGED_IN };

  const result = await deleteAllReviewsService(session.id, productId);

  return result;
}
