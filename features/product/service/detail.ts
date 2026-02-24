/**
 * File Name : features/product/service/detail.ts
 * Description : 제품 상세 조회 관련 로직 (본문, 타이틀, 상단바)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created
 * 2025.07.06  임도헌   Modified  getIsOwner import 변경
 * 2026.01.03  임도헌   Modified  ViewThrottle 기반 3분 쿨다운 조회수 증가 결과(null) 시 product.views fallback 유지
 * 2026.01.04  임도헌   Modified  incrementProductViews wrapper 도입(조회수 표시 보정 didIncrement 패턴 통일)
 * 2026.01.04  임도헌   Modified  wrapper(incrementProductViews) 제거 → lib/views/incrementViews 직접 호출로 단일 진입점 고정
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.19  임도헌   Modified  getIsOwner 제거 및 직접 비교 (세션 효율화)
 * 2026.01.20  임도헌   Moved     lib/getProductDetailData -> service/detail
 * 2026.01.22  임도헌   Modified  getCachedProductLikeStatus 호출 시 userId 전달
 * 2026.01.22  임도헌   Modified  Session 의존성 제거 (userId 주입)
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.13  임도헌   Modified  미사용 함수 getCachedProductTitleById 삭제(generateMetadata에서 getCachedProduct를 사용하므로 삭제함)
 */
import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import type { ProductDetailType } from "@/features/product/types";

/**
 * 제품 상세 본문 조회 (Cached)
 * 연관 데이터(User, Images, Category, Tags, LikeCount)를 포함하여 조회
 *
 * @param {number} id - 제품 ID
 * @returns {Promise<ProductDetailType | null>} 제품 상세 정보
 */
const getProductById = async (
  id: number
): Promise<ProductDetailType | null> => {
  try {
    const product = await db.product.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        images: {
          orderBy: { order: "asc" },
          select: { url: true, order: true },
        },
        category: {
          select: {
            eng_name: true,
            kor_name: true,
            icon: true,
            parent: {
              select: { eng_name: true, kor_name: true, icon: true },
            },
          },
        },
        search_tags: { select: { name: true } },
        _count: { select: { product_likes: true } },
      },
    });
    return product as ProductDetailType | null;
  } catch (e) {
    console.error("getProductById Error:", e);
    return null;
  }
};

/**
 * 제품 상세 조회 캐시 Wrapper
 * - 태그: PRODUCT_DETAIL_ID(id), PRODUCT_VIEWS(id)
 */
export const getCachedProduct = (id: number) => {
  return nextCache(() => getProductById(id), ["product-detail", String(id)], {
    tags: [T.PRODUCT_DETAIL_ID(id), T.PRODUCT_VIEWS(id)],
  })();
};

/**
 * 상단바용 경량 데이터 조회
 * - 뒤로가기, 카테고리 칩, 수정 버튼 노출 여부 판단용
 */
export async function getProductTopbar(id: number) {
  const product = await db.product.findUnique({
    where: { id },
    select: {
      userId: true,
      categoryId: true,
      category: {
        select: { id: true, kor_name: true, icon: true },
      },
    },
  });

  if (!product)
    return {
      categoryId: null,
      categoryLabel: null,
      categoryIcon: null,
      isOwner: false,
      ownerId: null,
    };

  return {
    categoryId: product.categoryId,
    categoryLabel: product.category?.kor_name ?? null,
    categoryIcon: product.category?.icon ?? null,
    ownerId: product.userId,
  };
}
