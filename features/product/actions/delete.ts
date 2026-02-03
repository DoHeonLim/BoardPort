/**
 * File Name : features/product/actions/delete.ts
 * Description : 제품 삭제 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   제품 삭제 액션 분리
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/products/view/[id]/actions/delete.ts -> features/product/actions/delete.ts
 */
"use server";

import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import getSession from "@/lib/session";
import { deleteProduct } from "@/features/product/service/delete";

/**
 * 제품 삭제 Action
 * - 로그인 세션을 확인합니다.
 * - Service 계층을 호출하여 제품을 삭제합니다. (소유권 검증 포함)
 * - 삭제된 제품 정보를 바탕으로 관련 캐시를 광범위하게 무효화합니다.
 *   (상세 페이지, 전체 목록, 판매자의 판매/예약/완료 목록, 구매자의 구매 목록)
 *
 * @param {number} productId - 삭제할 제품 ID
 * @returns {Promise<{ success: boolean; error?: string }>} 성공 여부
 */
export async function deleteProductAction(
  productId: number
): Promise<{ success: boolean; error?: string }> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const result = await deleteProduct(session.id, productId);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  const meta = result.data;

  // 캐시 무효화
  revalidateTag(T.PRODUCT_DETAIL_ID(productId)); // 상세 페이지
  revalidateTag(T.PRODUCT_LIST()); // 전체 목록

  // 판매자의 프로필 목록 및 카운트
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SELLING", meta.userId));
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("RESERVED", meta.userId));
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SOLD", meta.userId));
  revalidateTag(T.USER_PRODUCTS_COUNTS_ID(meta.userId));

  // 구매자가 있었다면 구매자의 구매 목록 및 카운트
  if (meta.purchase_userId) {
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("PURCHASED", meta.purchase_userId));
    revalidateTag(T.USER_PRODUCTS_COUNTS_ID(meta.purchase_userId));
  }

  return { success: true };
}
