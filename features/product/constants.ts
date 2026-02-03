/**
 * File Name : features/product/constants.ts
 * Description : 공통 제품 select 쿼리 상수
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
 */

// =============================================================================
// 1. Enum Arrays (유효성 검사 및 타입 정의용)
// =============================================================================
export const GAME_TYPES = ["BOARD_GAME", "TRPG", "CARD_GAME"] as const;
export const CONDITION_TYPES = ["NEW", "LIKE_NEW", "GOOD", "USED"] as const;
export const COMPLETENESS_TYPES = [
  "PERFECT",
  "USED",
  "REPLACEMENT",
  "INCOMPLETE",
] as const;
export const PRODUCT_STATUS_TYPES = ["selling", "reserved", "sold"] as const;

// =============================================================================
// 2. Display Maps (UI 표시용 라벨)
// =============================================================================

export const GAME_TYPE_DISPLAY = {
  BOARD_GAME: "보드게임",
  TRPG: "TRPG",
  CARD_GAME: "카드게임",
} as const;

export const CONDITION_DISPLAY = {
  NEW: "새제품급",
  LIKE_NEW: "거의새것",
  GOOD: "사용감있음",
  USED: "많이사용됨",
} as const;

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

// =============================================================================
// 3. Prisma Select Queries
// =============================================================================

/** 기본 제품 목록 조회용 Select (ProductList, Search 등) */
export const PRODUCT_SELECT = {
  id: true,
  title: true,
  price: true,
  created_at: true,
  views: true,
  reservation_userId: true,
  purchase_userId: true,
  game_type: true,

  // 이미지 (대표 이미지 1장)
  images: {
    where: { order: 0 },
    take: 1,
    select: {
      url: true,
      order: true,
    },
  },

  // 카테고리 (계층 구조 포함)
  category: {
    select: {
      kor_name: true,
      eng_name: true,
      icon: true,
      parent: {
        select: {
          kor_name: true,
          eng_name: true,
          icon: true,
        },
      },
    },
  },

  // 좋아요 개수
  _count: {
    select: {
      product_likes: true,
    },
  },

  // 검색 태그
  search_tags: {
    select: {
      name: true,
    },
  },
} as const;

/**
 * 프로필(판매/구매) 목록 조회용 Unified Select
 * - MySales/MyPurchases 양쪽에서 필요한 모든 필드를 포함하여 쿼리 재사용성을 높임
 */
export const PROFILE_SALES_UNIFIED_SELECT = {
  id: true,
  title: true,
  price: true,

  // 리스트 공통 타임스탬프
  created_at: true,
  updated_at: true,

  // 대표 이미지 1장
  images: { where: { order: 0 }, take: 1, select: { url: true, order: true } },

  // 거래 상태 및 상대방 정보
  reservation_userId: true,
  reservation_at: true,
  reservation_user: { select: { id: true, username: true, avatar: true } },

  purchase_userId: true,
  purchased_at: true,
  purchase_user: { select: { id: true, username: true, avatar: true } },

  // 카드 메타 정보
  views: true,
  game_type: true,

  category: {
    select: {
      kor_name: true,
      icon: true,
      parent: { select: { kor_name: true, icon: true } },
    },
  },

  _count: { select: { product_likes: true } },
  search_tags: { select: { name: true } },

  // 판매자 정보 (구매 목록에서 필요)
  user: { select: { username: true, avatar: true } },

  // 리뷰 상태 확인용
  reviews: {
    select: {
      id: true,
      userId: true,
      productId: true,
      payload: true,
      rate: true,
    },
  },
} as const;
