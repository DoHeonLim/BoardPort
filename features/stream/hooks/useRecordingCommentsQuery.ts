/**
 * File Name : features/stream/hooks/useRecordingCommentsQuery.ts(전 이름: useRecordingComment)
 * Description : 녹화본 댓글 조회 전용 훅 (CQRS Query 분리 & Suspense 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.05  임도헌   Renamed   useStreamComment → useRecordingComment 이름 변경 및 구조 통일
 * 2025.09.12  임도헌   Modified  캐시 limit 전달, 커서 안전 비교, 에러코드 분기 표준화
 * 2025.09.20  임도헌   Modified  streamId → vodId 전환, actions 호출부 정합성
 * 2026.01.16  임도헌   Moved     hooks -> hooks/stream
 * 2026.01.18  임도헌   Moved     hooks/stream -> features/stream/hooks
 * 2026.01.28  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.03.01  임도헌   Modified  useInfiniteQuery 적용 및 수동 상태 동기화 제거
 * 2026.03.03  임도헌   Modified  useRecordingComment에서 Read 로직 분리 및 useSuspenseInfiniteQuery 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getRecordingCommentsListAction } from "@/features/stream/actions/comments";
import { queryKeys } from "@/lib/queryKeys";

/**
 * 녹화본 댓글 조회 전용 Suspense Query 훅
 *
 * [상태 추출 및 데이터 페칭 로직]
 * - `useSuspenseInfiniteQuery`를 사용하여 선언적 데이터 페칭 및 에러 바운더리 연동 지원
 * - 서버 액션(`getRecordingCommentsListAction`)을 호출하여 커서 기반 다음 페이지 데이터 조회
 * - 평탄화된 배열(comments) 및 페이징 상태(hasNextPage, loadMore 등) 추출 및 반환
 *
 * @param {number} vodId - 대상 녹화본(VOD) ID
 * @param {number} [pageSize=10] - 페이지당 로드할 댓글 수
 */
export function useRecordingCommentsQuery(vodId: number, pageSize = 10) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: queryKeys.streams.vodComments(vodId),
      queryFn: async ({ pageParam }) => {
        return await getRecordingCommentsListAction(
          vodId,
          pageParam as number | undefined,
          pageSize
        );
      },
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (lastPage: any) => {
        return lastPage.length === pageSize
          ? lastPage[lastPage.length - 1].id
          : undefined;
      },
      staleTime: 60 * 1000,
    });

  // Suspense가 동작하므로 data는 undefined일 수 없음을 보장
  const comments = data.pages.flat();

  return {
    comments,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
