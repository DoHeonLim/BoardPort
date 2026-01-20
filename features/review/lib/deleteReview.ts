/**
 * File Name : features/review/lib/deleteReview.ts
 * Description : 리뷰 단건 삭제 + 관련 캐시 태그 재검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.17  임도헌    Moved     lib/review/deleteReview로 이동(server-only) + 기존 revalidateTag 정책 유지
 * 2025.11.05  임도헌   Modified   세션 기반 권한(작성자/상품소유자) 검증 추가
 * 2025.11.19  임도헌   Modified   리뷰 삭제 시 판매자 평균 평점, 리뷰 목록 및 해당 제품 상세 최신화
 * 2026.01.19  임도헌   Moved      lib/review -> features/review/lib
 */

"use server";

import { revalidateTag } from "next/cache";
import db from "@/lib/db";
import getSession from "@/lib/session";
import * as T from "@/lib/cacheTags";

export const deleteReview = async (reviewId: number) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const rev = await db.review.findUnique({
    where: { id: reviewId },
    select: {
      userId: true,
      product: { select: { userId: true, id: true } },
    },
  });
  if (!rev) throw new Error("리뷰를 찾을 수 없습니다.");

  const isAuthor = rev.userId === session.id;
  const isProductOwner = rev.product?.userId === session.id;
  if (!isAuthor && !isProductOwner) {
    throw new Error("리뷰를 삭제할 권한이 없습니다.");
  }

  await db.review.delete({ where: { id: reviewId } });

  if (rev.product?.userId) {
    revalidateTag(T.USER_AVERAGE_RATING_ID(rev.product.userId));
    revalidateTag(T.USER_REVIEWS_INITIAL_ID(rev.product.userId));
  }
  if (rev.product?.id) {
    revalidateTag(T.PRODUCT_DETAIL_ID(rev.product.id));
  }

  return { success: true };
};
