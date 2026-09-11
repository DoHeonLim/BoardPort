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
 * 2026.05.03  임도헌   Modified  최근 본 상품 스냅샷에도 연결 보드게임 정보를 함께 저장
 * 2026.08.27  임도헌   Modified  최근 본 상품에 실제 끌어올리기 노출 시각을 저장하도록 공용 변환 함수 적용
 * 2026.09.09  임도헌   Modified  전체 상세 DTO 대신 서버에서 만든 최근 본 상품 스냅샷만 수신
 */

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  removeRecentViewedProduct,
  saveRecentViewedProduct,
} from "@/features/product/utils/recentViewed";
import type { RecentViewedProduct } from "@/features/product/utils/recentViewedSnapshot";
import {
  consumeNavigationRefresh,
  NAVIGATION_REFRESH_SCOPES,
} from "@/lib/navigationRefreshFlag";

interface ProductDetailClientEffectsProps {
  productId: number;
  recentProduct: RecentViewedProduct | null;
  isModalContext: boolean;
}

/**
 * 상세 화면에서 브라우저 의존 부작용만 처리하는 전용 클라이언트 island.
 * 최근 본 상품 저장, 숨김 상품 정리, 편집 후 복귀 시 1회 refresh처럼
 * 서버에서 다룰 수 없는 동작만 담당해 본문 렌더링은 최대한 서버 컴포넌트로 유지
 */
export default function ProductDetailClientEffects({
  productId,
  recentProduct,
  isModalContext,
}: ProductDetailClientEffectsProps) {
  const router = useRouter();

  // 브라우저 저장소 기반 최근 본 상품 동기화
  useEffect(() => {
    if (!recentProduct) {
      removeRecentViewedProduct(productId);
      return;
    }

    saveRecentViewedProduct(recentProduct);
  }, [productId, recentProduct]);

  // 일반 상세 detail-edit back 복귀 시에만 서버 payload 1회 재요청
  useEffect(() => {
    if (isModalContext) return;

    // detail-edit 저장 후 back 복귀한 기존 상세의 1회 최신화
    if (
      !consumeNavigationRefresh(
        NAVIGATION_REFRESH_SCOPES.PRODUCT_DETAIL,
        productId
      )
    ) {
      return;
    }
    router.refresh();
  }, [isModalContext, productId, router]);

  return null;
}
