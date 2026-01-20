/**
 * File Name : features/product/lib/deleteProduct.ts
 * Description : 제품 삭제
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.15  임도헌   Created
 * 2025.06.15  임도헌   Modified  제품 삭제 함수 분리
 * 2025.11.19  임도헌   Modified  해당 제품 상세, 프로필 탭/카운트 캐시 초기화 추가
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 */
"use server";

import db from "@/lib/db";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";

export async function deleteProduct(id: number) {
  // 삭제 전 소유자/상태 조회
  const prod = await db.product.findUnique({
    where: { id },
    select: {
      userId: true,
      purchase_userId: true,
      reservation_userId: true,
    },
  });
  if (!prod) {
    return;
  }

  await db.product.delete({ where: { id } });

  // 상세 페이지 및 프로필 탭/카운트 캐시 무효화
  revalidateTag(T.PRODUCT_DETAIL_ID(id));
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SELLING", prod.userId));
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("RESERVED", prod.userId));
  revalidateTag(T.USER_PRODUCTS_SCOPE_ID("SOLD", prod.userId));
  revalidateTag(T.USER_PRODUCTS_COUNTS_ID(prod.userId));

  if (prod.purchase_userId) {
    revalidateTag(T.USER_PRODUCTS_SCOPE_ID("PURCHASED", prod.purchase_userId));
    revalidateTag(T.USER_PRODUCTS_COUNTS_ID(prod.purchase_userId));
  }
}
