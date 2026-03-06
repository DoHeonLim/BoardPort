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
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getPostCommentsListAction } from "@/features/post/actions/comments";
import { queryKeys } from "@/lib/queryKeys";

/**
 * 게시글 댓글 목록 조회 전용 Suspense Query 훅
 *
 * [상태 추출 및 사이드 이펙트 제어 로직]
 * - `useSuspenseInfiniteQuery`를 사용하여 선언적 데이터 페칭 및 에러 바운더리 연동 지원
 * - 서버 액션(`getPostCommentsListAction`)을 호출하여 커서 기반 다음 페이지 데이터 조회
 * - 평탄화된 배열(comments) 및 페이징 상태(hasNextPage, loadMore 등) 추출 및 반환
 *
 * @param {number} postId - 댓글을 조회할 게시글 ID
 * @param {number} [pageSize=10] - 페이지당 로드할 댓글 수
 */
export function usePostCommentsQuery(postId: number, pageSize = 10) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: queryKeys.posts.comments(postId),
      queryFn: async ({ pageParam }) => {
        return await getPostCommentsListAction(
          postId,
          pageParam as number | undefined,
          pageSize
        );
      },
      initialPageParam: undefined as number | undefined,
      getNextPageParam: (lastPage) => {
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
