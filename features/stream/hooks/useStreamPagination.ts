/**
 * File Name : features/stream/hooks/useStreamPagination.ts
 * Description : 스트리밍 목록 Suspense 무한 스크롤 페이징 전용 커스텀 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.01  임도헌   Created   StreamList 내부 상태를 TanStack Query 기반으로 추출
 * 2026.03.03  임도헌   Modified  delta.ts 이벤트 버스 구독 로직 완전 제거 (useFollowToggle 캐시 조작으로 이관)
 * 2026.03.03  임도헌   Modified  useSuspenseInfiniteQuery 적용 및 initialData Prop Drilling 제거
 * 2026.03.04  임도헌   Modified  getStreamsListAction 연동 및 쿼리 페이징 통합
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.04.17  임도헌   Modified  현재 훅이 담당하는 범위가 무한 스크롤 페이징 중심으로 읽히도록 설명을 최신화
 */

"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getStreamsListAction } from "@/features/stream/actions/list";
import { queryKeys } from "@/lib/queryKeys";
import type { BroadcastSummary } from "@/features/stream/types";

interface UseStreamPaginationParams {
  scope: "all" | "following";
  searchParams: Record<string, string>;
  viewerId?: number | null;
}

export interface UseStreamPaginationResult {
  streams: BroadcastSummary[];
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
}

/**
 * 스트리밍 목록 Suspense 무한 스크롤 훅
 *
 * [데이터 페칭 및 캐시 전략]
 * - `scope`와 검색 파라미터를 queryKey에 반영해 라이브 목록 캐시를 조건별로 분리
 * - `useSuspenseInfiniteQuery`로 커서 기반 다음 페이지 요청을 관리
 * - 누적 페이지를 평탄화한 `streams` 배열과 다음 페이지 제어값만 상위 리스트에 전달
 *
 * @param {UseStreamPaginationParams} params - 범위 필터와 검색 조건, 조회자 정보
 * @returns {UseStreamPaginationResult} 평탄화된 스트림 목록 및 페이징 제어 인터페이스
 */
export function useStreamPagination({
  scope,
  searchParams,
  viewerId,
}: UseStreamPaginationParams): UseStreamPaginationResult {
  const queryKey = queryKeys.streams.list(scope, searchParams);

  // TanStack Query를 활용한 무한 스크롤 쿼리 구성
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) => {
        // 서버 액션을 호출하여 커서 기반 다음 페이지 데이터를 가져옴
        return await getStreamsListAction(
          scope,
          pageParam as number | null,
          searchParams,
          viewerId ?? null
        );
      },
      initialPageParam: null as number | null,
      // 다음 페이지 요청 시 사용할 커서 추출
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // 불필요한 백그라운드 리패치 방지를 위한 캐시 유효 시간 설정 (1분)
      staleTime: 60 * 1000,
    });

  const streams = data.pages.flatMap((page) => page.streams);

  return {
    streams,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
