/**
 * File Name : features/stream/hooks/useChannelRecordingsPagination.ts
 * Description : 유저 채널 다시보기 무한 스크롤 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.15  임도헌   Created   채널 다시보기 SSR 첫 페이지와 추가 페이지를 TanStack Query로 연결
 * 2026.05.19  임도헌   Modified  Client queryFn 추가 페이지 조회의 Server Action 직접 호출을 피하도록 Route Handler fetch로 전환
 * 2026.08.13  임도헌   Modified  채널 다시보기 query key에 현재 조회자 범위 추가
 */
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { RecordingsPage, VodForGrid } from "@/features/stream/types";

interface UseChannelRecordingsPaginationParams {
  ownerId: number;
  viewerId?: number | null;
  initialRecordings: VodForGrid[];
  initialNextCursor: number | null;
}

interface UseChannelRecordingsPaginationResult {
  recordings: VodForGrid[];
  isFetchingNextPage: boolean;
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
}

/**
 * 채널 다시보기 Route Handler 요청 URL 생성
 *
 * @param {number} ownerId - 채널 소유자 ID
 * @param {number | null} cursor - 다음 페이지 커서
 * @returns {string} 채널 다시보기 API URL
 */
function buildChannelRecordingsApiUrl(
  ownerId: number,
  cursor: number | null
): string {
  const params = new URLSearchParams({ ownerId: String(ownerId) });

  if (cursor !== null) {
    params.set("cursor", String(cursor));
  }

  return `/api/streams/channel-recordings?${params.toString()}`;
}

/**
 * 채널 다시보기 Route Handler 응답 조회
 * Client Component queryFn에서는 Server Action 직접 호출 대신 HTTP fetch를 사용해 초기 렌더 fetch waterfall 오류를 방지
 *
 * @param {string} url - 요청 URL
 * @returns {Promise<RecordingsPage>} 채널 다시보기 페이지
 */
async function fetchChannelRecordingsPage(
  url: string
): Promise<RecordingsPage> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("채널 다시보기를 불러오지 못했습니다.");
  }

  return (await response.json()) as RecordingsPage;
}

/**
 * 유저 채널 다시보기 무한 스크롤 훅
 *
 * [데이터 전략]
 * - 서버 컴포넌트에서 받은 첫 페이지를 initialData로 사용해 초기 중복 요청을 피함
 * - 이후 페이지는 채널 전용 Route Handler로 조회해 Client queryFn의 Server Action 직접 호출을 피함
 * - PRIVATE/FOLLOWERS 접근 플래그는 추가 페이지 요청 시 최신 세션 기준으로 보정
 */
export function useChannelRecordingsPagination({
  ownerId,
  viewerId = null,
  initialRecordings,
  initialNextCursor,
}: UseChannelRecordingsPaginationParams): UseChannelRecordingsPaginationResult {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.streams.channelRecordings(ownerId, viewerId),
      queryFn: ({ pageParam }) => {
        // 추가 페이지만 Route Handler로 조회해 SSR 첫 페이지와 Client queryFn 재조회 책임을 분리
        return fetchChannelRecordingsPage(
          buildChannelRecordingsApiUrl(ownerId, pageParam as number | null)
        );
      },
      initialPageParam: null as number | null,
      initialData: {
        pages: [
          {
            recordings: initialRecordings,
            nextCursor: initialNextCursor,
          } satisfies RecordingsPage,
        ],
        pageParams: [null],
      },
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 60 * 1000,
      enabled: ownerId > 0,
    });

  return {
    recordings: data.pages.flatMap((page) => page.recordings),
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
