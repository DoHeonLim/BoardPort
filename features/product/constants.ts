/**
 * File Name : features/product/constants.ts
 * Description : 제품 도메인 공용 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.29  임도헌   Created
 * 2025.05.29  임도헌   Modified  기존 select 쿼리 상수로 분리
 * 2025.10.17  임도헌   Created   MySales/MyPurchases에서 실사용 필드만 분리
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.19  임도헌   Renamed   PostSelect -> constants 이름 변경
 * 2026.01.21  임도헌   Moved     features/product/lib -> features/product/constants.ts
 * 2026.01.24  임도헌   Modified  lib/constants.ts에서 제품 Enum 및 Display Map 이관 및 통합
 * 2026.01.25  임도헌   Modified  PRODUCT_STATUS_LABEL 및 PRODUCT_STATUS_TYPES 추가 및 주석 보강
 * 2026.03.12  임도헌   Modified  사용자 업로드 이미지의 애니메이션 메타 조회 필드 추가
 * 2026.04.02  임도헌   Modified  Prisma select 쿼리 상수를 selects.ts로 분리해 역할 정리
 * 2026.04.02  임도헌   Modified  Enum/정책/라벨 상수 설명 보강
 */

// =============================================================================
// 1. Enum Arrays (유효성 검사 및 타입 정의용)
// =============================================================================
/** 지원하는 게임 장르 목록 */
export const GAME_TYPES = ["BOARD_GAME", "TRPG", "CARD_GAME"] as const;
/** 상품 상태 등급 목록 */
export const CONDITION_TYPES = ["NEW", "LIKE_NEW", "GOOD", "USED"] as const;
/** 구성품 완전성 등급 목록 */
export const COMPLETENESS_TYPES = [
  "PERFECT",
  "USED",
  "REPLACEMENT",
  "INCOMPLETE",
] as const;
/** 판매 상태 목록 */
export const PRODUCT_STATUS_TYPES = ["selling", "reserved", "sold"] as const;
/** 기타 카테고리 영문 키 */
export const PRODUCT_OTHER_CATEGORY_ENG_NAME = "OTHER" as const;

/** 끌어올리기 가능 주기(시간) */
export const BUMP_COOLDOWN_HOURS = 24;
/** 상품별 최대 끌어올리기 횟수 */
export const MAX_BUMP_COUNT = 5;

// =============================================================================
// 2. Display Maps (UI 표시용 라벨)
// =============================================================================

/** 게임 장르 표시 라벨 */
export const GAME_TYPE_DISPLAY = {
  BOARD_GAME: "보드게임",
  TRPG: "TRPG",
  CARD_GAME: "카드게임",
} as const;

/** 상품 상태 등급 표시 라벨 */
export const CONDITION_DISPLAY = {
  NEW: "새제품급",
  LIKE_NEW: "거의새것",
  GOOD: "사용감있음",
  USED: "많이사용됨",
} as const;

/** 구성품 완전성 표시 라벨 */
export const COMPLETENESS_DISPLAY = {
  PERFECT: "완벽",
  USED: "사용감 있음",
  REPLACEMENT: "대체 부품",
  INCOMPLETE: "부품 누락",
} as const;

/** 판매 상태 라벨 */
export const PRODUCT_STATUS_LABEL = {
  selling: "판매 중",
  reserved: "예약 중",
  sold: "판매 완료",
} as const;

