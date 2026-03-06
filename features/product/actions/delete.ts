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
 * 2026.02.22  임도헌   Modified  상품 삭제 시 관련된 모든 유저의 채팅방 목록 캐시 무효화 추가
 * 2026.03.05  임도헌   Modified  삭제 시의 복잡한 개인화 캐시 `revalidateTag` 의존성 제거, 공통 상세 정보 캐시 무효화만 남겨 최적화
 */
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import getSession from "@/lib/session";
import { deleteProduct } from "@/features/product/service/delete";

/**
 * 제품 삭제 Action
 * - 로그인 세션을 확인
 * - Service 계층을 호출하여 제품을 삭제 (소유권 검증 포함)
 * - 삭제된 제품 정보를 바탕으로 관련 캐시를 광범위하게 무효화
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

  revalidateTag(T.PRODUCT_DETAIL(productId)); // 상세 캐시는 무효화
  revalidatePath("/products");
  revalidatePath("/profile");

  return { success: true };
}
