/**
 * File Name : features/user/service/review.ts
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
 * 2026.02.05  임도헌   Modified   리뷰 조회 시 차단 유저 필터링 로직 추가
 * 2026.03.05  임도헌   Modified  서버 캐싱(`unstable_cache`) 래퍼 제거 및 파편화된 조회 함수를 단일 페이징 함수(`getUserReviews`)로 통합
 */
import "server-only";
import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ProfileReview, ReviewCursor } from "@/features/user/types";
import { getBlockedUserIds } from "@/features/user/service/block";

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

// 2. 조회 조건 생성 (내가 받은 리뷰 + 차단 필터링)
async function receivedReviewsWhere(
  targetUserId: number,
  viewerId: number | null
): Promise<Prisma.ReviewWhereInput> {
  const base: Prisma.ReviewWhereInput = {
    userId: { not: targetUserId }, // 작성자가 내가 아님
    OR: [
      { product: { userId: targetUserId, purchase_userId: { not: null } } },
      { product: { purchase_userId: targetUserId } },
    ],
  };

  // 차단된 유저가 쓴 리뷰 제외
  if (viewerId) {
    const blockedIds = await getBlockedUserIds(viewerId);
    if (blockedIds.length > 0) {
      base.userId = { notIn: blockedIds };
    }
  }

  return base;
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
 * 리뷰 목록 통합 조회 로직
 *
 * [데이터 가공 및 페이징 전략]
 * - 커서 기반 키셋(Keyset) 페이지네이션 적용 (created_at, id 내림차순 정렬)
 * - 조회자(`viewerId`)의 차단 유저 리뷰 필터링 적용
 * - DB 모델의 DTO 변환을 통한 일관된 응답 객체 반환
 *
 * @param {number} targetUserId - 리뷰 대상 유저 ID
 * @param {ReviewCursor | null} cursor - 페이지네이션 커서
 * @param {number} limit - 페이지당 로드 개수
 * @param {number | null} viewerId - 조회자 ID
 */
export async function getUserReviews(
  targetUserId: number,
  cursor: ReviewCursor | null = null,
  limit = 10,
  viewerId: number | null = null
) {
  const base = await receivedReviewsWhere(targetUserId, viewerId);
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
    ? { lastCreatedAt: tail.created_at, lastId: tail.id }
    : null;

  return { reviews, nextCursor };
}
