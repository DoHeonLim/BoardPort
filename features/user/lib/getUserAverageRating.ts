/**
 * File Name : features/user/lib/getUserAverageRating.ts
 * Description : 유저 평균 평점/리뷰 수 — Review.rate 기준
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/actions → lib/user로 분리
 * 2025.10.07  임도헌   Modified   반환 타입(ProfileAverageRating) 추가
 * 2025.10.23  임도헌   Modified   태그 네이밍 표준화와 wrapper 일관 적용
 * 2025.10.29  임도헌   Modified   Number 캐스팅 + 소수점 1자리 반올림(0~5 클램프)
 * 2026.01.19  임도헌   Moved     lib/user -> features/user/lib
 */
"use server";
import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import type { ProfileAverageRating } from "@/types/profile";

/**
 * revalidateTag 메모
 * - 리뷰 생성/수정/삭제 후:
 *   revalidateTag(`user-average-rating-id-${sellerId}`);
 */

// 프로필 받은 후기(판매+구매) 공통 where
function receivedReviewsWhere(targetUserId: number): Prisma.ReviewWhereInput {
  return {
    userId: { not: targetUserId }, // 내가 쓴 건 제외
    OR: [
      { product: { userId: targetUserId, purchase_userId: { not: null } } }, // 판매자로 받은
      { product: { purchase_userId: targetUserId } }, // 구매자로 받은
    ],
  };
}

/** 판매자(userId) 상품에 달린 리뷰(본인 제외)의 평균/개수 */
export const getUserAverageRating = async (
  userId: number
): Promise<ProfileAverageRating> => {
  const where = receivedReviewsWhere(userId);

  const agg = await db.review.aggregate({
    where,
    _avg: { rate: true },
    _count: { rate: true },
  });

  const avg = Number(agg._avg.rate ?? 0);
  const clamped = Math.min(5, Math.max(0, avg));
  const rounded = Math.round(clamped * 10) / 10;

  return { averageRating: rounded, reviewCount: Number(agg._count.rate ?? 0) };
};

/** 권장: 호출 시점 wrapper로 per-id 태그 주입 + 키 표준화 */
export const getCachedUserAverageRating = (userId: number) => {
  const cached = nextCache(
    async (uid: number) => getUserAverageRating(uid),
    // 키는 "함수 성격 + by-id"로 고정, 파라미터는 인자 해시로 구분됨
    ["user-average-rating-by-id"],
    { tags: [T.USER_AVERAGE_RATING_ID(userId)] }
  );
  return cached(userId);
};
