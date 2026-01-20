/**
 * File Name : features/review/lib/deleteAllProductReviews.ts
 * Description : 특정 제품의 모든 리뷰 삭제 + 관련 캐시 태그 재검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.17  임도헌    Moved     lib/review/deleteAllProductReviews로 이동(server-only) + 기존 revalidateTag 정책 유지
 * 2025.11.19  임도헌   Modified   리뷰 삭제 시 판매자 평균 평점, 리뷰 목록 및 해당 제품 상세 최신화
 * 2026.01.19  임도헌   Moved      lib/review -> features/review/lib
 */
"use server";

import { revalidateTag } from "next/cache";
import db from "@/lib/db";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";

export const deleteAllProductReviews = async (productId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const prod = await db.product.findUnique({
    where: { id: productId },
    select: { userId: true },
  });
  if (!prod) throw new Error("상품을 찾을 수 없습니다.");
  if (prod.userId !== session.id) throw new Error("권한이 없습니다.");

  await db.review.deleteMany({ where: { productId } });

  revalidateTag(T.USER_AVERAGE_RATING_ID(prod.userId));
  revalidateTag(T.USER_REVIEWS_INITIAL_ID(prod.userId));
  revalidateTag(T.PRODUCT_DETAIL_ID(productId));
  return { success: true };
};
