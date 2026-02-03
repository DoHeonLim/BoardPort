/**
 * File Name : features/review/constants.ts
 * Description : 리뷰 도메인 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   리뷰 관련 상수 정의
 */

// 리뷰 길이 및 평점 제한
export const REVIEW_MIN_LENGTH = 2;
export const REVIEW_MAX_LENGTH = 1000;
export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;

// 에러 메시지 모음
export const REVIEW_ERRORS = {
  NOT_LOGGED_IN: "로그인이 필요합니다.",
  PRODUCT_NOT_FOUND: "상품을 찾을 수 없습니다.",
  UNAUTHORIZED: "권한이 없습니다.",
  INVALID_STATUS: "판매완료 상태에서만 리뷰를 작성할 수 있습니다.",
  ALREADY_EXISTS: "이미 이 상품에 리뷰를 작성하셨습니다.",
  SERVER_ERROR: "리뷰 처리 중 오류가 발생했습니다.",
} as const;
