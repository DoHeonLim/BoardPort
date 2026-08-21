/**
 * File Name : features/post/hooks/usePostCommentsQuery.ts (전 이름: usePostComment)
 * Description : 게시글 댓글 조회 전용 훅 (CQRS Query 분리 & Suspense 적용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.11  임도헌   Created   useComment 통합 훅
 * 2026.01.16  임도헌   Moved     hooks -> hooks/post
 * 2026.01.16  임도헌   Renamed   useComment -> usePostComment
 * 2026.01.18  임도헌   Moved     hooks/post -> features/post/hooks
 * 2026.01.22  임도헌   Modified  Action Import 경로 수정
 * 2026.01.27  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.03.03  임도헌   Modified  useState 기반 상태 관리 제거 및 TanStack Query(useInfiniteQuery, useMutation)로 전면 마이그레이션
 * 2026.03.03  임도헌   Modified  usePostComment에서 Read 로직 분리 및 useSuspenseInfiniteQuery 적용
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.31  임도헌   Modified  커서 조회와 평탄화 반환 역할이 보이도록 설명 톤 통일
 * 2026.04.17  임도헌   Modified  댓글 무한스크롤 훅의 다음 커서 규칙과 반환 책임 설명 보강
 * 2026.05.19  임도헌   Modified  Client queryFn 초기 렌더의 조회용 Server Action 호출 오류를 피하도록 Route Handler fetch로 전환
 * 2026.08.13  임도헌   Modified  댓글 query key를 게시글과 조회자 기준으로 분리
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type { PostComment } from "@/features/post/types";

/**
 * 게시글 댓글 Route Handler 요청 URL 생성
 *
 * @param postId - 댓글을 조회할 게시글 ID
 * @param cursor - 다음 페이지 커서
 * @param limit - 페이지당 로드할 댓글 수
 * @returns 게시글 댓글 API URL
 */
function buildPostCommentsApiUrl(
  postId: number,
  cursor: number | undefined,
  limit: number
) {
  const params = new URLSearchParams({ limit: String(limit) });

  if (cursor !== undefined) {
    params.set("cursor", String(cursor));
  }

  return `/api/posts/${postId}/comments?${params.toString()}`;
}

/**
 * 게시글 댓글 Route Handler 응답 조회
 * Client Component queryFn에서는 Server Action 직접 호출 대신 HTTP fetch를 사용해 초기 렌더 fetch waterfall 오류를 방지
 *
 * @param url - 요청 URL
 * @returns 게시글 댓글 목록
 */
async function fetchPostCommentsPage(url: string): Promise<PostComment[]> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("게시글 댓글을 불러오지 못했습니다.");
  }

  return response.json();
}

/**
 * 게시글 댓글 목록 조회 전용 Suspense Query 훅
 *
 * [기능]
 * - `useSuspenseInfiniteQuery`로 댓글 목록을 커서 기반으로 조회
 * - Route Handler fetch로 Server Action 직접 호출을 피하고 다음 페이지를 이어서 읽음
 * - 마지막 페이지가 `pageSize`만큼 찼을 때만 끝 댓글 ID를 다음 커서로 이어 붙임
 * - 평탄화된 comments 배열과 페이지네이션 상태를 함께 반환
 *
 * @param {number} postId - 댓글을 조회할 게시글 ID
 * @param {number} viewerId - 댓글 필터 기준 조회자 ID
 * @param {number} [pageSize=10] - 페이지당 로드할 댓글 수
 * @returns {object} 평탄화된 댓글 배열과 다음 페이지 로딩 상태, loadMore 제어값
 */
export function usePostCommentsQuery(
  postId: number,
  viewerId: number,
  pageSize = 10
) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: queryKeys.posts.comments(postId, viewerId),
      queryFn: async ({ pageParam }) => {
        // Client queryFn의 Server Action 직접 호출은 초기 렌더 waterfall 오류가 날 수 있어 Route Handler fetch 사용
        return fetchPostCommentsPage(
          buildPostCommentsApiUrl(
            postId,
            pageParam as number | undefined,
            pageSize
          )
        );
      },
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (lastPage) => {
        // 마지막 페이지가 pageSize를 채운 경우에만 다음 페이지 존재로 판단
        return lastPage.length === pageSize
          ? lastPage[lastPage.length - 1].id
          : undefined;
      },
      staleTime: 60 * 1000,
    });

  // Suspense 환경 기준 평탄화
  const comments = data.pages.flat();

  return {
    comments,
    isFetchingNextPage,
    hasNextPage: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
