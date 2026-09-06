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
 * 2026.05.19  임도헌   Modified  Client queryFn 초기 렌더의 조회용 Server Action 호출 오류를 피하도록 Route Handler fetch로 전환
 * 2026.06.25  임도헌   Modified  viewerId URL 전달 제거 및 조회자/팔로잉 필터별 query key 스코프 분리
 * 2026.08.13  임도헌   Modified  다시보기 목록 query key의 조회자 범위 구조 통일
 * 2026.08.26  임도헌   Modified  정렬값 동률을 보존하는 불투명 복합 커서 전달
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type {
  RecordingListCursor,
  RecordingsPage,
  VodForGrid,
} from "@/features/stream/types";

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
 * 다시보기 목록 Route Handler 요청 URL 생성
 *
 * @param {UseRecordingPaginationParams & { cursor: RecordingListCursor | null }} params - 정렬, 필터, 조회자, 커서 정보
 * @returns {string} 다시보기 목록 API URL
 */
function buildRecordingsApiUrl({
  sort,
  followingOnly,
  searchParams,
  cursor,
}: Omit<UseRecordingPaginationParams, "viewerId"> & {
  cursor: RecordingListCursor | null;
}): string {
  const params = new URLSearchParams({ sort });

  if (followingOnly) {
    params.set("followingOnly", "true");
  }

  if (cursor !== null) {
    params.set("cursor", String(cursor));
  }

  const category = searchParams.category;
  const keyword = searchParams.keyword;

  if (category) {
    params.set("category", category);
  }

  if (keyword) {
    params.set("keyword", keyword);
  }

  return `/api/streams/recordings?${params.toString()}`;
}

/**
 * 다시보기 목록 Route Handler 응답 조회
 * Client Component queryFn에서는 Server Action 직접 호출 대신 HTTP fetch를 사용해 초기 렌더 fetch waterfall 오류를 방지
 *
 * @param {string} url - 요청 URL
 * @returns {Promise<RecordingsPage>} 다시보기 목록 페이지
 */
async function fetchRecordingsPage(url: string): Promise<RecordingsPage> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("다시보기 목록을 불러오지 못했습니다.");
  }

  return (await response.json()) as RecordingsPage;
}

/**
 * 다시보기 목록 Suspense 무한 스크롤 훅
 *
 * [기능]
 * - 정렬 기준과 보조 필터를 queryKey에 반영해 캐시를 분리
 * - Route Handler fetch로 Server Action 직접 호출을 피하고 다음 페이지를 커서 방식으로 조회
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
  const queryKey = queryKeys.streams.recordingList(
    sort,
    {
      ...searchParams,
      followingOnly,
    },
    viewerId ?? null
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) => {
        // Client queryFn의 Server Action 직접 호출은 초기 렌더 waterfall 오류가 날 수 있어 Route Handler fetch 사용
        return fetchRecordingsPage(
          buildRecordingsApiUrl({
            sort,
            followingOnly,
            searchParams,
            cursor: pageParam as RecordingListCursor | null,
          })
        );
      },
      initialPageParam: null as RecordingListCursor | null,
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
