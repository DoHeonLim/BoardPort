/**
 * File Name : app/products/view/[id]/actions/product
 * Description : 제품 정보 조회 관련 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.12  임도헌   Created   제품 상세 정보 관련 서버 코드 분리
 * 2025.06.08  임도헌   Modified  actions 파일 역할별 분리 시작
 * 2025.07.06  임도헌   Modified  getIsOwner 함수 lib로 이동
 * 2026.01.04  임도헌   Modified  getCachedProduct cache key에 id 포함(per-id 캐시 충돌 방지 + PRODUCT_VIEWS 태그 정합성 강화)
 * 2026.01.04  임도헌   Modified  generateMetadata 전용 title-only fetch/cache 도입
 */
"use server";

import db from "@/lib/db";
import { ProductDetailType } from "@/types/product";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";

/**
 * 제품 상세 정보를 가져오는 함수 (상세 화면 렌더링용: include가 많아도 됨)
 * @param id 제품 ID
 * @returns 제품 상세 정보 또는 null
 */
export const getProduct = async (
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
              select: {
                eng_name: true,
                kor_name: true,
                icon: true,
              },
            },
          },
        },
        search_tags: { select: { name: true } },
        _count: { select: { product_likes: true } },
      },
    });

    if (!product) return null;
    return product as ProductDetailType;
  } catch (e) {
    console.error("[getProduct] 제품 정보 조회 실패:", e);
    return null;
  }
};

/**
 * 제품 상세 정보 캐싱 함수 (상세 페이지 본문용)
 * - 상세 본문은 images/category/tags/likes_count 등 다 필요하므로 기존대로 유지
 * - PRODUCT_VIEWS 태그를 함께 구독하여 didIncrement 보정과 함께 정합성을 유지
 */
export const getCachedProduct = (id: number) => {
  return nextCache(() => getProduct(id), ["product-detail-by-id", String(id)], {
    tags: [T.PRODUCT_DETAIL_ID(id), T.PRODUCT_VIEWS(id)],
  })();
};

/**
 * 제품 제목만 가져오는 경량 함수 (metadata/title 전용)
 * - generateMetadata 경로에서 getCachedProduct를 호출하면 불필요한 include(join) 비용이 커지므로 분리
 * - 세션/조회수/좋아요/오너 체크와 무관하게 "읽기 전용"으로 안전해야 한다.
 */
export const getProductTitleById = async (
  id: number
): Promise<string | null> => {
  try {
    const row = await db.product.findUnique({
      where: { id },
      select: { title: true },
    });
    return row?.title ?? null;
  } catch (e) {
    console.error("[getProductTitleById] title 조회 실패:", e);
    return null;
  }
};

/**
 * 제품 제목 캐싱 함수 (metadata/title 전용)
 * - 상세 본문 캐시와 분리하여: (1) join 비용 제거 (2) 캐시 invalidation 범위 최소화
 * - title 변경은 결국 PRODUCT_DETAIL_ID(id) 무효화 흐름에서 함께 갱신되는 게 자연스럽다.
 */
export const getCachedProductTitleById = (id: number) => {
  return nextCache(
    () => getProductTitleById(id),
    ["product-title-by-id", String(id)],
    {
      tags: [T.PRODUCT_DETAIL_ID(id)],
    }
  )();
};
