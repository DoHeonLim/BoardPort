/**
 * File Name : features/product/lib/getProductDetailData.ts
 * Description : 제품 상세 데이터 반환
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
 * 2026.01.19  임도헌   Modified  [Refactor] getIsOwner 제거 및 직접 비교 (세션 효율화)
 */

import { redirect } from "next/navigation";
import getSession from "@/lib/session";
import { incrementViews } from "@/lib/viewCounter";
import { getCachedProductLikeStatus } from "@/app/products/view/[id]/actions/like";
import { getCachedProduct } from "@/app/products/view/[id]/actions/product";
import { ProductDetailType } from "@/types/product";

export interface ProductDetailData {
  product: ProductDetailType;
  views: number;
  isOwner: boolean;
  likeCount: number;
  isLiked: boolean;
}

export async function getProductDetailData(
  id: number
): Promise<ProductDetailData | null> {
  if (!Number.isFinite(id) || id <= 0) return null;

  const session = await getSession();
  if (!session?.id) {
    redirect("/login?callbackUrl=/products");
  }

  const product = await getCachedProduct(id);
  if (!product) return null;

  const isOwner = !!session.id && session.id === product.user.id;

  const [didIncrement, likeStatus] = await Promise.all([
    // didIncrement=false(쿨다운/실패)면 product.views를 그대로 표시한다.
    incrementViews({
      target: "PRODUCT",
      targetId: id,
      viewerId: session.id ?? null,
    }),

    getCachedProductLikeStatus(product.id),
  ]);

  return {
    product,
    views: (product.views ?? 0) + (didIncrement ? 1 : 0),
    isOwner,
    likeCount: likeStatus.likeCount,
    isLiked: likeStatus.isLiked,
  };
}
