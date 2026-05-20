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
 * 2026.05.08  임도헌   Modified  스트림 조회 범위 타입을 StreamScope 공용 타입으로 교체
 * 2026.05.19  임도헌   Modified  Client queryFn 초기 렌더의 조회용 Server Action 호출 오류를 피하도록 Route Handler fetch로 전환
 */

"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type {
  BroadcastSummary,
  StreamScope,
  StreamsPage,
} from "@/features/stream/types";

interface UseStreamPaginationParams {
  scope: StreamScope;
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
 * 라이브 방송 목록 Route Handler 요청 URL 생성
 *
 * @param {UseStreamPaginationParams & { cursor: number | null }} params - 범위, 검색 조건, 조회자, 커서 정보
 * @returns {string} 라이브 방송 목록 API URL
 */
function buildStreamsApiUrl({
  scope,
  searchParams,
  viewerId,
  cursor,
}: UseStreamPaginationParams & { cursor: number | null }): string {
  const params = new URLSearchParams({ scope });

  if (cursor !== null) {
    params.set("cursor", String(cursor));
  }

  if (viewerId !== undefined && viewerId !== null) {
    params.set("viewerId", String(viewerId));
  }

  const category = searchParams.category;
  const keyword = searchParams.keyword;

  if (category) {
    params.set("category", category);
  }

  if (keyword) {
    params.set("keyword", keyword);
  }

  return `/api/streams?${params.toString()}`;
}

/**
 * 라이브 방송 목록 Route Handler 응답 조회
 * Client Component queryFn에서는 Server Action 직접 호출 대신 HTTP fetch를 사용해 초기 렌더 fetch waterfall 오류를 방지
 *
 * @param {string} url - 요청 URL
 * @returns {Promise<StreamsPage>} 라이브 방송 목록 페이지
 */
async function fetchStreamsPage(url: string): Promise<StreamsPage> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("스트리밍 목록을 불러오지 못했습니다.");
  }

  return (await response.json()) as StreamsPage;
}

/**
 * 스트리밍 목록 Suspense 무한 스크롤 훅
 *
 * [데이터 페칭 및 캐시 전략]
 * - `scope`와 검색 파라미터를 queryKey에 반영해 라이브 목록 캐시를 조건별로 분리
 * - Route Handler fetch와 `useSuspenseInfiniteQuery`로 Server Action 직접 호출을 피하고 커서 기반 다음 페이지 요청을 관리
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
        // Client queryFn의 Server Action 직접 호출은 초기 렌더 waterfall 오류가 날 수 있어 Route Handler fetch 사용
        return fetchStreamsPage(
          buildStreamsApiUrl({
            scope,
            searchParams,
            viewerId,
            cursor: pageParam as number | null,
          })
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
