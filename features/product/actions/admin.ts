/**
 * File Name : features/product/actions/admin.ts
 * Description : 관리자 상품 관리 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   초기 구현
 * 2026.02.07  임도헌   Modified  ServiceResult 및 DTO 타입 적용
 * 2026.02.22  임도헌   Modified  관리자 삭제 시 유저 프로필 및 채팅방 캐시 완벽 무효화
 */
"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { verifyAdminAccess } from "@/features/auth/service/authSession";
import {
  deleteProductByAdmin,
  getProductsAdmin,
} from "@/features/product/service/admin";
import type { ServiceResult } from "@/lib/types";
import type { AdminProductListResponse } from "@/features/product/types";

/**
 * 관리자 상품 목록 조회 Action
 * - 관리자 권한을 검증하고 Service를 호출
 */
export async function getProductsAdminAction(
  page: number,
  query?: string
): Promise<ServiceResult<AdminProductListResponse>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };
  return await getProductsAdmin(page, 20, query);
}

/**
 * 관리자 상품 삭제 Action
 * - 관리자 권한을 검증하고 상품을 삭제
 * - 삭제 후 관리자 목록 및 공개 목록 페이지를 갱신
 */
export async function deleteProductAdminAction(
  productId: number,
  reason: string
) {
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const res = await deleteProductByAdmin(auth.adminId, productId, reason);

  if (res.success && res.data) {
    const meta = res.data;

    // 관리자가 지워도 유저의 프로필 탭과 채팅방에서 즉시 사라지도록 동기화
    revalidateTag(T.PRODUCT_DETAIL_ID(productId));
    revalidateTag(T.PRODUCT_LIST());

    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SELLING", meta.userId));
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("RESERVED", meta.userId));
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SOLD", meta.userId));
    revalidateTag(T.USER_PRODUCTS_COUNTS_ID(meta.userId));

    if (meta.purchase_userId) {
      revalidateTag(
        T.USER_PRODUCTS_SCOPE_ID("PURCHASED", meta.purchase_userId)
      );
      revalidateTag(T.USER_PRODUCTS_COUNTS_ID(meta.purchase_userId));
    }
    if (meta.reservation_userId) {
      revalidateTag(
        T.USER_PRODUCTS_SCOPE_ID("RESERVED", meta.reservation_userId)
      );
      revalidateTag(T.USER_PRODUCTS_COUNTS_ID(meta.reservation_userId));
    }

    meta.chatUserIds.forEach((uid) => {
      revalidateTag(T.CHAT_ROOMS_ID(uid));
    });

    revalidatePath("/admin/products");
    revalidatePath("/products");
  }
  return res;
}
