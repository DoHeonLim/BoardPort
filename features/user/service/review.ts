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
 * 2026.03.26  임도헌   Modified   차단 필터 병합 시 자기 작성 리뷰 제외 조건이 유지되도록 received 조건 정정
 * 2026.05.13  임도헌   Modified   후기 목록 페이징에서 마지막 페이지가 불필요한 추가 요청을 만들지 않도록 nextCursor 계산 보정
 * 2026.05.16  임도헌   Modified   후기 select를 selects.ts로 분리하고 DTO 매핑 타입을 명시
 */
import "server-only";
import db from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { ProfileReview, ReviewCursor } from "@/features/user/types";
import { getBlockedUserIds } from "@/features/user/service/block";
import { PROFILE_REVIEW_SELECT } from "@/features/user/selects";

type ProfileReviewRow = Prisma.ReviewGetPayload<{
  select: typeof PROFILE_REVIEW_SELECT;
}>;

// Prisma row -> 프로필 후기 DTO 매핑
function toProfileReviewDTO(r: ProfileReviewRow): ProfileReview {
  return {
    id: r.id,
    created_at: r.created_at,
    rate: r.rate,
    payload: r.payload,
    user: r.user,
    product: { id: r.product.id, title: r.product.title },
  };
}

// 조회 조건 생성
// 내가 받은 리뷰 조건과 조회자 기준 차단 필터 결합
async function receivedReviewsWhere(
  targetUserId: number,
  viewerId: number | null
): Promise<Prisma.ReviewWhereInput> {
  const blockedIds = viewerId !== null ? await getBlockedUserIds(viewerId) : [];

  const base: Prisma.ReviewWhereInput = {
    userId: {
      not: targetUserId, // 작성자가 대상 유저 본인이 아님
      ...(blockedIds.length > 0 ? { notIn: blockedIds } : {}),
    },
    OR: [
      { product: { userId: targetUserId, purchase_userId: { not: null } } },
      { product: { purchase_userId: targetUserId } },
    ],
  };

  return base;
}

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
  // 기본 조회 조건 계산
  const base = await receivedReviewsWhere(targetUserId, viewerId);
  // 커서 기반 키셋 조건 조립
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

  // 페이지 크기 제한 및 리뷰 row 조회
  const take = Math.max(1, Math.min(limit, 50));
  const rows = await db.review.findMany({
    where,
    select: PROFILE_REVIEW_SELECT,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take: take + 1,
  });

  // DTO 변환 및 다음 커서 계산
  const hasMore = rows.length > take;
  const pageRows = hasMore ? rows.slice(0, take) : rows;
  const reviews = pageRows.map(toProfileReviewDTO);
  const tail = pageRows[pageRows.length - 1];
  const nextCursor = hasMore && tail
    ? { lastCreatedAt: tail.created_at, lastId: tail.id }
    : null;

  return { reviews, nextCursor };
}
