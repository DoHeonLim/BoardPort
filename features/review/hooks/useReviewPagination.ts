/**
 * File Name : features/review/hooks/useReviewPagination.ts
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
 * 2026.04.03  임도헌   Modified  파일 헤더 오타 수정
 * 2026.04.17  임도헌   Modified  리뷰 무한스크롤 훅의 캐시/커서/반환 책임 설명 보강
 * 2026.08.13  임도헌   Modified  차단 필터가 반영된 리뷰 cache를 조회자별로 분리
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
 * [기능]
 * - 대상 사용자와 조회자 ID를 함께 query key에 반영해 차단 필터 결과를 격리 보존
 * - `useSuspenseInfiniteQuery`로 프로필 리뷰 모달의 첫 렌더를 Suspense 경계와 맞춰 단순화
 * - 서버 액션(`getUserReviewsAction`)이 반환한 키셋 커서(`lastCreatedAt`, `lastId`)를 다음 페이지 기준으로 재사용
 * - 평탄화된 리뷰 배열(reviews)과 추가 데이터 로딩 상태를 함께 반환
 *
 * @param {number} userId - 리뷰를 조회할 대상 사용자 ID
 * @param {number | null} viewerId - 차단 필터 기준 조회자 ID
 * @returns {UseReviewPaginationResult} 추출된 리뷰 배열 및 페이징 상태 객체
 */
export function useReviewPagination(
  userId: number,
  viewerId: number | null
): UseReviewPaginationResult {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: queryKeys.reviews.user(userId, viewerId),
      queryFn: async ({ pageParam }) => {
        // 서버 액션 기반 리뷰 목록 패칭
        return await getUserReviewsAction(userId, pageParam as ReviewCursor);
      },
      initialPageParam: null as ReviewCursor | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 60 * 1000,
    });

  // 페이지 단위 응답의 리뷰 리스트 즉시 렌더링용 1차원 배열 변환
  const reviews = data.pages.flatMap((p) => p.reviews);

  return {
    reviews,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
