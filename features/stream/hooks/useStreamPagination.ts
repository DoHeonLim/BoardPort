/**
 * File Name : features/stream/hooks/useStreamPagination.ts
 * Description : 스트리밍 목록 무한 스크롤 및 팔로우 상태 동기화를 처리하는 커스텀 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.01  임도헌   Created   StreamList 내부 상태를 TanStack Query 기반으로 추출
 * 2026.03.03  임도헌   Modified  delta.ts 이벤트 버스 구독 로직 완전 제거 (useFollowToggle 캐시 조작으로 이관)
 * 2026.03.03  임도헌   Modified  useSuspenseInfiniteQuery 적용 및 initialData Prop Drilling 제거
 * 2026.03.04  임도헌   Modified  getStreamsListAction 연동 및 쿼리 페이징 통합
 * 2026.03.05  임도헌   Modified  주석 최신화
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
 * 스트리밍 목록 페이징 및 실시간 동기화 처리
 *
 * [데이터 페칭 및 캐시 전략]
 * - 검색 조건(scope, searchParams) 기반 고유 Query Key 생성 및 캐시 분리
 * - useSuspenseInfiniteQuery를 활용한 커서 기반 페이지네이션 및 서버 측 초기 데이터 하이드레이션
 * - 데이터 페칭 성공 시 평탄화(FlatMap)된 스트림 목록 반환
 * - 전역 팔로우 상태 조작을 통한 방송 잠금 상태(`followersOnlyLocked`) 실시간 백그라운드 갱신 유도
 *
 * @param {UseStreamPaginationParams} params - 검색 필터 및 뷰어 정보
 * @returns {UseStreamPaginationResult} 평탄화된 목록 및 페이징 제어 인터페이스
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
