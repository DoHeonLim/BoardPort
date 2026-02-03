/**
 * File Name : features/user/lib/review.ts
 * Description : 유저 리뷰 조회 서비스
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
 * 2026.01.19  임도헌   Moved      lib/user -> features/user/lib
 * 2026.01.24  임도헌   Moved      features/user/lib -> features/service
 */
import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import type { Prisma } from "@/generated/prisma/client";
import type { ProfileReview, ReviewCursor } from "@/features/user/types";

// 1. Prisma -> DTO 매핑
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

// 2. 조회 조건 생성 (내가 받은 리뷰)
// - 내가 판매한 물건에 대한 리뷰 OR 내가 구매한 물건에 대한 판매자 리뷰
function receivedReviewsWhere(targetUserId: number): Prisma.ReviewWhereInput {
  return {
    userId: { not: targetUserId }, // 작성자가 내가 아님
    OR: [
      { product: { userId: targetUserId, purchase_userId: { not: null } } },
      { product: { purchase_userId: targetUserId } },
    ],
  };
}

const reviewSelect = {
  id: true,
  created_at: true,
  rate: true,
  payload: true,
  user: { select: { id: true, username: true, avatar: true } },
  product: {
    select: { id: true, title: true, userId: true, purchase_userId: true },
  },
} as const;

/**
 * 초기 리뷰 목록 조회 (Cached)
 * - 프로필 첫 진입 시 빠른 로딩을 위해 캐싱된 데이터를 반환합니다.
 */
const _getInitialReviewsBase = async (
  targetUserId: number,
  limit: number
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

export const getCachedInitialUserReviews = (userId: number, limit = 10) => {
  const cached = nextCache(
    async (uid: number, lim: number) => _getInitialReviewsBase(uid, lim),
    ["user-reviews-initial-by-id"],
    { tags: [T.USER_REVIEWS_INITIAL_ID(userId)] }
  );
  return cached(userId, limit);
};

/**
 * 추가 리뷰 목록 로드 (Non-Cached, Cursor)
 * - 무한 스크롤 시 커서 기반으로 조회합니다.
 */
export const getMoreUserReviews = async (
  targetUserId: number,
  cursor?: ReviewCursor,
  limit = 10
) => {
  const base = receivedReviewsWhere(targetUserId);
  const where: Prisma.ReviewWhereInput = cursor
    ? {
        ...base,
        // Keyset Pagination: (created_at, id) 복합 커서 사용
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
    ? { lastCreatedAt: tail.created_at, lastId: tail.id }
    : null;

  return { reviews, nextCursor };
};
