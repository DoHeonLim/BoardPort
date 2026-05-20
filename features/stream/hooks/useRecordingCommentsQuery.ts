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
 * 2026.03.31  임도헌   Modified  커서 조회와 평탄화 반환 역할이 보이도록 설명 톤 통일
 * 2026.05.13  임도헌   Modified  댓글 페이징 응답의 nextCursor를 사용해 불필요한 빈 추가 요청을 방지
 * 2026.05.19  임도헌   Modified  Client queryFn 초기 렌더의 조회용 Server Action 호출 오류를 피하도록 Route Handler fetch로 전환
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { StreamComment } from "@/features/stream/types";

interface RecordingCommentsPage {
  comments: StreamComment[];
  nextCursor?: number;
}

/**
 * 녹화본 댓글 Route Handler 요청 URL 생성
 *
 * @param vodId - 대상 녹화본 ID
 * @param cursor - 다음 페이지 커서
 * @param limit - 페이지당 로드할 댓글 수
 * @returns 녹화본 댓글 API URL
 */
function buildRecordingCommentsApiUrl(
  vodId: number,
  cursor: number | undefined,
  limit: number
) {
  const params = new URLSearchParams({ limit: String(limit) });

  if (cursor !== undefined) {
    params.set("cursor", String(cursor));
  }

  return `/api/streams/recordings/${vodId}/comments?${params.toString()}`;
}

/**
 * 녹화본 댓글 Route Handler 응답 조회
 * Client Component queryFn에서는 Server Action 직접 호출 대신 HTTP fetch를 사용해 초기 렌더 fetch waterfall 오류를 방지
 *
 * @param url - 요청 URL
 * @returns 녹화본 댓글 목록 페이지
 */
async function fetchRecordingCommentsPage(
  url: string
): Promise<RecordingCommentsPage> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("녹화본 댓글을 불러오지 못했습니다.");
  }

  return response.json();
}

/**
 * 녹화본 댓글 조회 전용 Suspense Query 훅
 *
 * [기능]
 * - `useSuspenseInfiniteQuery`로 녹화본 댓글 목록을 커서 기반으로 조회
 * - Route Handler fetch로 Server Action 직접 호출을 피하고 다음 페이지를 이어서 읽음
 * - 평탄화된 comments 배열과 페이지네이션 상태를 함께 반환
 *
 * @param {number} vodId - 대상 녹화본(VOD) ID
 * @param {number} [pageSize=10] - 페이지당 로드할 댓글 수
 */
export function useRecordingCommentsQuery(vodId: number, pageSize = 10) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: queryKeys.streams.vodComments(vodId),
      queryFn: async ({ pageParam }) => {
        // Client queryFn의 Server Action 직접 호출은 초기 렌더 waterfall 오류가 날 수 있어 Route Handler fetch 사용
        return fetchRecordingCommentsPage(
          buildRecordingCommentsApiUrl(
            vodId,
            pageParam as number | undefined,
            pageSize
          )
        );
      },
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 60 * 1000,
    });

  // Suspense 환경 기준 평탄화
  const comments = data.pages.flatMap((page) => page.comments);

  return {
    comments,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
