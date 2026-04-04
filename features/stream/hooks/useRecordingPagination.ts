/**
 * File Name : features/stream/hooks/useRecordingPagination.ts
 * Description : 메인 다시보기 목록 무한 스크롤 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.28  임도헌   Created   다시보기 목록용 Suspense Infinite Query 훅 추가
 * 2026.03.29  임도헌   Modified  최신/인기 정렬과 팔로잉만 보조 필터를 같은 쿼리 키 기준으로 정렬
 * 2026.03.31  임도헌   Modified  export 훅 역할과 반환값이 바로 보이도록 JSDoc 보강
 * 2026.04.02  임도헌   Modified  다시보기 페이징 훅 파라미터/반환 타입 설명 보강
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getRecordingsListAction } from "@/features/stream/actions/list";
import { queryKeys } from "@/lib/queryKeys";
import type { VodForGrid } from "@/features/stream/types";

interface UseRecordingPaginationParams {
  sort: "latest" | "popular";
  followingOnly?: boolean;
  searchParams: Record<string, string>;
  viewerId?: number | null;
}

/** 다시보기 목록 페이징 훅 반환값 */
export interface UseRecordingPaginationResult {
  recordings: VodForGrid[];
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
}

/**
 * 다시보기 목록 Suspense 무한 스크롤 훅
 *
 * [기능]
 * - 정렬 기준과 보조 필터를 queryKey에 반영해 캐시를 분리
 * - 서버 액션 기반으로 다음 페이지를 커서 방식으로 조회
 * - 평탄화된 recordings 배열과 페이징 상태를 함께 반환
 *
 * @param {UseRecordingPaginationParams} params - 정렬/필터/조회자 정보
 * @returns {UseRecordingPaginationResult} 평탄화된 다시보기 목록과 페이징 제어값
 */
export function useRecordingPagination({
  sort,
  followingOnly = false,
  searchParams,
  viewerId,
}: UseRecordingPaginationParams): UseRecordingPaginationResult {
  // 정렬/검색 조건이 바뀌면 목록 캐시도 별도 스코프로 분리
  const queryKey = queryKeys.streams.recordingList(sort, searchParams);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) =>
        getRecordingsListAction(
          sort,
          followingOnly,
          pageParam as number | null,
          searchParams,
          viewerId ?? null
        ),
      initialPageParam: null as number | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 60 * 1000,
    });

  // Suspense 기준으로 누적 페이지를 평탄화해 그리드 렌더링에 바로 전달
  const recordings = data.pages.flatMap((page) => page.recordings);

  return {
    recordings,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
