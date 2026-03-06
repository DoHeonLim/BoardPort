/**
 * File Name : features/review/hooks/usePushNotification.ts
 * Description : 유저 리뷰 무한 스크롤을 위한 커스텀 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.15  임도헌   Created   [Move] ProfileReviewsModal에서 로직 분리
 * 2026.01.16  임도헌   Moved     hooks -> hooks/review
 * 2026.01.18  임도헌   Moved     hooks/review -> features/review/hooks
 * 2026.03.01  임도헌   Modified  useInfiniteQuery 도입 및 수동 상태 동기화 로직 제거
 * 2026.03.03  임도헌   Modified  useSuspenseInfiniteQuery 적용 및 initialReviews Props 제거
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { getUserReviewsAction } from "@/features/user/actions/review";
import type { ProfileReview, ReviewCursor } from "@/features/user/types";

export interface UseReviewPaginationResult {
  reviews: ProfileReview[];
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
}

/**
 * 사용자 프로필 리뷰 목록 무한 스크롤 훅
 *
 * [상태 추출 및 페이징 제어 로직]
 * - `queryKeys.reviews.user(userId)` 식별자를 통해 대상 사용자별 리뷰 쿼리 상태를 격리 보존
 * - `useSuspenseInfiniteQuery` 연동을 통해 데이터 지연 로딩 방지 및 선언적 에러 핸들링 지원
 * - 서버 액션(`getUserReviewsAction`) 호출 및 키셋 커서(`lastCreatedAt`, `lastId`) 기반 페이징 자동화
 * - 평탄화된 리뷰 배열(reviews) 및 추가 데이터 패칭 상태 추출
 *
 * @param {number} userId - 리뷰를 조회할 대상 사용자 ID
 * @returns {UseReviewPaginationResult} 추출된 리뷰 배열 및 페이징 상태 객체
 */
export function useReviewPagination(userId: number): UseReviewPaginationResult {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: queryKeys.reviews.user(userId),
      queryFn: async ({ pageParam }) => {
        return await getUserReviewsAction(userId, pageParam as ReviewCursor);
      },
      initialPageParam: null as ReviewCursor | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 60 * 1000,
    });

  const reviews = data.pages.flatMap((p) => p.reviews);

  return {
    reviews,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
