/**
 * File Name : features/user/lib/getUserReviews.ts
 * Description : 유저 프로필 리뷰 조회(초기/키셋 페이지네이션)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.05  임도헌   Created
 * 2025.10.05  임도헌   Moved      app/(tabs)/profile/actions → lib/user로 분리
 * 2025.10.05  임도헌   Modified   created_at 도입 + 키셋 페이지네이션 안정화
 * 2025.10.07  임도헌   Modified   반환 타입(ProfileReview) 및 커서 타입 추가
 * 2025.10.23  임도헌   Modified   태그 네이밍 표준화와 wrapper 일관 적용
 * 2025.10.29  임도헌   Modified   types/profile & schema.prisma 반영(rate/payload), select 최소화, DTO 매핑, limit 클램프
 * 2026.01.19  임도헌   Moved     lib/user -> features/user/lib
 */
"use server";
import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import type { Prisma } from "@/generated/prisma/client";
import type { ProfileReview } from "@/types/profile";

export type ReviewCursor = { lastCreatedAt: Date; lastId: number } | null;

/**
 * revalidateTag 메모
 * - 리뷰 생성/수정/삭제 후:
 *   revalidateTag(`user-reviews-initial-id-${sellerId}`);
 *   revalidateTag(`user-average-rating-id-${sellerId}`);
 *
 * 인덱스(스키마 기준):
 * - Review: @@index([created_at]), @@index([userId]), @@index([productId])
 * - Product: @@index([userId]) (Seller), @@index([created_at])
 */

// 필요한 필드만 select (스키마/타입에 정확히 맞춤)
const reviewSelect = {
  id: true,
  created_at: true,
  rate: true,
  payload: true,
  user: { select: { id: true, username: true, avatar: true } }, // 작성자(리뷰어)
  product: {
    select: { id: true, title: true, userId: true, purchase_userId: true },
  },
} as const;

// Prisma → ProfileReview DTO 매핑 (types/profile 준수)
function toProfileReviewDTO(r: any): ProfileReview {
  return {
    id: r.id,
    created_at: r.created_at,
    rate: r.rate,
    payload: r.payload,
    user: r.user,
    product: { id: r.product.id, title: r.product.title },
  };
}

// 공통 where (타입 명시)
function receivedReviewsWhere(targetUserId: number): Prisma.ReviewWhereInput {
  return {
    userId: { not: targetUserId }, // 내가 쓴 건 제외
    OR: [
      // 내가 판매자였고 실제 판매가 성립한 거래에서 받은 리뷰
      { product: { userId: targetUserId, purchase_userId: { not: null } } },
      // 내가 구매자였던 거래에서 받은 리뷰
      { product: { purchase_userId: targetUserId } },
    ],
  };
}

/** 초기 N개 (created_at desc, id desc) */
export const getInitialUserReviews = async (
  targetUserId: number,
  limit = 10
): Promise<ProfileReview[]> => {
  const where = receivedReviewsWhere(targetUserId);
  const take = Math.max(1, Math.min(limit, 50));

  const rows = await db.review.findMany({
    where,
    select: reviewSelect,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take,
  });

  return rows.map(toProfileReviewDTO);
};

export const getMoreUserReviews = async (
  targetUserId: number,
  cursor?: ReviewCursor,
  limit = 10
) => {
  const base = receivedReviewsWhere(targetUserId);
  const where: Prisma.ReviewWhereInput = cursor
    ? {
        ...base,
        AND: [
          {
            OR: [
              { created_at: { lt: cursor.lastCreatedAt } },
              {
                AND: [
                  { created_at: cursor.lastCreatedAt },
                  { id: { lt: cursor.lastId } },
                ],
              },
            ],
          },
        ],
      }
    : base;

  const take = Math.max(1, Math.min(limit, 50));
  const rows = await db.review.findMany({
    where,
    select: reviewSelect,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take,
  });

  const reviews = rows.map(toProfileReviewDTO);
  const tail = rows[rows.length - 1];
  const nextCursor = tail
    ? { lastCreatedAt: tail.created_at as Date, lastId: tail.id }
    : null;

  return { reviews, nextCursor };
};

/** 초기 번들 캐시: per-id 태그 + 고정 키 */
export const getCachedInitialUserReviews = (userId: number, limit = 10) => {
  const cached = nextCache(
    async (uid: number, lim: number) => getInitialUserReviews(uid, lim),
    ["user-reviews-initial-by-id"],
    { tags: [T.USER_REVIEWS_INITIAL_ID(userId)] }
  );
  return cached(userId, limit);
};
