/**
 * File Name : features/stream/hooks/useChannelRecordingsPagination.ts
 * Description : 유저 채널 다시보기 무한 스크롤 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.15  임도헌   Created   채널 다시보기 SSR 첫 페이지와 추가 페이지를 TanStack Query로 연결
 */
"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getChannelVodsAction } from "@/features/stream/actions/list";
import { queryKeys } from "@/lib/queryKeys";
import type { RecordingsPage, VodForGrid } from "@/features/stream/types";

interface UseChannelRecordingsPaginationParams {
  ownerId: number;
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
 * 유저 채널 다시보기 무한 스크롤 훅
 *
 * [데이터 전략]
 * - 서버 컴포넌트에서 받은 첫 페이지를 initialData로 사용해 초기 중복 요청을 피함
 * - 이후 페이지는 채널 전용 Server Action으로 조회해 PRIVATE/FOLLOWERS 접근 플래그를 최신 세션 기준으로 보정
 */
export function useChannelRecordingsPagination({
  ownerId,
  initialRecordings,
  initialNextCursor,
}: UseChannelRecordingsPaginationParams): UseChannelRecordingsPaginationResult {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: queryKeys.streams.channelRecordings(ownerId),
      queryFn: ({ pageParam }) =>
        getChannelVodsAction(ownerId, pageParam as number | null),
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
