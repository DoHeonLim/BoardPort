/**
 * File Name : features/product/lib/constants.ts
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
 */

export const PRODUCT_SELECT = {
  title: true,
  price: true,
  created_at: true,
  images: {
    where: { order: 0 },
    take: 1,
    select: {
      url: true,
      order: true,
    },
  },
  id: true,
  views: true,
  reservation_userId: true,
  purchase_userId: true,
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
  game_type: true,
  _count: {
    select: {
      product_likes: true,
    },
  },
  search_tags: {
    select: {
      name: true,
    },
  },
};

export const PROFILE_SALES_UNIFIED_SELECT = {
  id: true,
  title: true,
  price: true,

  // 대표 이미지 1장
  images: { where: { order: 0 }, take: 1, select: { url: true, order: true } },

  // 리스트 공통 타임스탬프
  created_at: true,
  updated_at: true,

  // my-sales 전용 상태 표시/액션용
  reservation_userId: true,
  reservation_at: true,
  reservation_user: { select: { id: true, username: true, avatar: true } },
  purchase_userId: true,
  purchased_at: true,
  purchase_user: { select: { id: true, username: true, avatar: true } },

  // 카드 하단 정보(프로필 카드에서 사용)
  views: true,
  category: {
    select: {
      kor_name: true,
      icon: true,
      parent: { select: { kor_name: true, icon: true } },
    },
  },
  game_type: true,
  _count: { select: { product_likes: true } },
  search_tags: { select: { name: true } },

  // my-sales 리뷰 모달/버튼에 필요
  user: { select: { username: true, avatar: true } },
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
