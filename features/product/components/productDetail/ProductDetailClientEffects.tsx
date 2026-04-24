/**
 * File Name : features/product/components/productDetail/ProductDetailClientEffects.tsx
 * Description : 제품 상세의 클라이언트 전용 부작용 처리
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.14  임도헌   Created   최근 본 상품 저장과 편집 후 refresh 플래그 소비를 별도 클라이언트 island로 분리
 * 2026.04.14  임도헌   Modified  클라이언트 island의 책임과 부작용 범위가 드러나도록 함수 상단 JSDoc 설명을 보강
 * 2026.04.24  임도헌   Modified  navigation refresh helper로 제품 상세 refresh flag 소비 로직을 단순화
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ProductDetailType } from "@/features/product/types";
import {
  removeRecentViewedProduct,
  saveRecentViewedProduct,
} from "@/features/product/utils/recentViewed";
import {
  consumeNavigationRefresh,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";

interface ProductDetailClientEffectsProps {
  product: ProductDetailType;
  isModalContext: boolean;
}

/**
 * 상세 화면에서 브라우저 의존 부작용만 처리하는 전용 클라이언트 island.
 * 최근 본 상품 저장, 숨김 상품 정리, 편집 후 복귀 시 1회 refresh처럼
 * 서버에서 다룰 수 없는 동작만 담당해 본문 렌더링은 최대한 서버 컴포넌트로 유지
 */
export default function ProductDetailClientEffects({
  product,
  isModalContext,
}: ProductDetailClientEffectsProps) {
  const router = useRouter();

  // 브라우저 저장소 기반 최근 본 상품 동기화
  useEffect(() => {
    if (product.hidden_at) {
      removeRecentViewedProduct(product.id);
      return;
    }

    // 최근 본 상품의 브라우저 저장소 한정 보관을 위한 서버 본문과의 분리
    saveRecentViewedProduct({
      id: product.id,
      title: product.title,
      price: product.price,
      created_at: product.created_at.toString(),
      refreshed_at: product.created_at.toString(),
      reservation_userId: product.reservation_userId,
      purchase_userId: product.purchase_userId,
      views: product.views,
      bump_count: product.bump_count,
      game_type: product.game_type,
      region1: product.region1 ?? null,
      region2: product.region2 ?? null,
      region3: product.region3 ?? null,
      images: product.images,
      category: product.category,
      _count: product._count,
      search_tags: product.search_tags,
    });
  }, [product]);

  // 일반 상세 detail-edit back 복귀 시에만 서버 payload 1회 재요청
  useEffect(() => {
    if (isModalContext) return;

    // detail-edit 저장 후 back 복귀한 기존 상세의 1회 최신화
    if (
      !consumeNavigationRefresh(
        NAVIGATION_REFRESH_SCOPES.PRODUCT_DETAIL,
        product.id
      )
    ) {
      return;
    }
    router.refresh();
  }, [isModalContext, product.id, router]);

  return null;
}
