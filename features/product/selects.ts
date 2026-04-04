/**
 * File Name : features/product/selects.ts
 * Description : 제품 도메인 Prisma select 쿼리 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   constants.ts에 섞여 있던 제품 조회 select 상수를 전용 파일로 분리
 */

/** 기본 제품 목록 조회용 Select (ProductList, Search 등) */
export const PRODUCT_SELECT = {
  id: true,
  title: true,
  price: true,
  created_at: true,
  refreshed_at: true,
  views: true,
  reservation_userId: true,
  purchase_userId: true,
  game_type: true,
  bump_count: true,
  region1: true,
  region2: true,
  region3: true,
  images: {
    where: { order: 0 },
    take: 1,
    select: {
      url: true,
      order: true,
      isAnimated: true,
    },
  },
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
} as const;

/**
 * 프로필(판매/구매) 목록 조회용 Unified Select
 * - MySales/MyPurchases 양쪽에서 필요한 모든 필드를 포함
 */
export const PROFILE_SALES_UNIFIED_SELECT = {
  id: true,
  title: true,
  price: true,
  created_at: true,
  updated_at: true,
  region1: true,
  region2: true,
  region3: true,
  images: {
    where: { order: 0 },
    take: 1,
    select: { url: true, order: true, isAnimated: true },
  },
  reservation_userId: true,
  reservation_at: true,
  reservation_user: { select: { id: true, username: true, avatar: true } },
  purchase_userId: true,
  purchased_at: true,
  purchase_user: { select: { id: true, username: true, avatar: true } },
  views: true,
  game_type: true,
  bump_count: true,
  category: {
    select: {
      kor_name: true,
      icon: true,
      parent: { select: { kor_name: true, icon: true } },
    },
  },
  _count: { select: { product_likes: true } },
  search_tags: { select: { name: true } },
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
