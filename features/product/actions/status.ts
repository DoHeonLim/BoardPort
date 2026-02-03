/**
 * File Name : features/product/actions/status.ts
 * Description : 제품 상태 변경 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   제품 상태 변경 액션 분리
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/products/view/[id]/actions/status.ts -> features/product/actions/status.ts
 */
"use server";

import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import getSession from "@/lib/session";
import { updateProductStatus } from "@/features/product/service/trade";
import type { ProductStatus } from "@/features/product/types";

/**
 * 제품 상태 변경 Action (판매중 <-> 예약중 <-> 판매완료)
 * - Service 계층을 호출하여 상태 변경, 알림 전송, 뱃지 부여 등을 처리합니다.
 * - 변경된 상태에 따라 판매자와 구매자(예약자)의 프로필 목록 캐시를 무효화합니다.
 *
 * @param {number} productId - 제품 ID
 * @param {ProductStatus} status - 변경할 상태 ("selling" | "reserved" | "sold")
 * @param {number} [selectUserId] - 예약 또는 판매 완료 대상 유저 ID (선택)
 * @returns {Promise<{ success: boolean; error?: string; newStatus?: string }>} 성공 여부 및 변경된 상태
 */
export async function updateProductStatusAction(
  productId: number,
  status: ProductStatus,
  selectUserId?: number
): Promise<{ success: boolean; error?: string; newStatus?: string }> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const result = await updateProductStatus(
    session.id,
    productId,
    status,
    selectUserId
  );

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const meta = result.data;

  // 캐시 무효화
  revalidateTag(T.PRODUCT_DETAIL_ID(productId));

  // 판매자의 판매/예약/완료 목록 갱신
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SELLING", meta.sellerId));
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("RESERVED", meta.sellerId));
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SOLD", meta.sellerId));
  revalidateTag(T.USER_PRODUCTS_COUNTS_ID(meta.sellerId));

  // 구매자(예약자)가 지정된 경우 해당 유저의 구매 목록 갱신
  if (meta.buyerId) {
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("PURCHASED", meta.buyerId));
    revalidateTag(T.USER_PRODUCTS_COUNTS_ID(meta.buyerId));

    // 거래 완료 시 리뷰/평점 데이터도 영향을 받을 수 있음
    revalidateTag(T.USER_REVIEWS_INITIAL_ID(meta.sellerId));
    revalidateTag(T.USER_REVIEWS_INITIAL_ID(meta.buyerId));
    revalidateTag(T.USER_AVERAGE_RATING_ID(meta.sellerId));
    revalidateTag(T.USER_AVERAGE_RATING_ID(meta.buyerId));
  }

  return { success: true, newStatus: meta.newStatus };
}
