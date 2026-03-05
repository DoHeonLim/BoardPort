/**
 * File Name : features/post/hooks/usePostPagination.ts
 * Description : 게시글 무한 스크롤을 위한 커서 기반 페이지네이션 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 무한 스크롤 훅 생성
 * 2025.07.04  임도헌   Modified  검색 파라미터 대응 및 상태 초기화 추가
 * 2026.01.16  임도헌   Moved     hooks -> hooks/post
 * 2026.01.18  임도헌   Moved     hooks/post -> features/post/hooks
 * 2026.01.27  임도헌   Modified  주석 및 로직 설명 보강
 * 2026.02.15  임도헌   Modified  searchParams 연동 강화
 * 2026.02.28  임도헌   Modified  TanStack Query (useInfiniteQuery) 도입으로 수동 상태 관리 및 병합 로직 제거
 * 2026.03.01  임도헌   Modified  Product 도메인과 패턴 통일 (isFetchingNextPage 분리 및 반환 타입 명시)
 * 2026.03.03  임도헌   Modified  useSuspenseInfiniteQuery 적용 및 initialData Prop Drilling 제거
 * 2026.03.04  임도헌   Modified  getPostsListAction 연동 및 쿼리 조회 로직 통합
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { getPostsListAction } from "@/features/post/actions/list";
import { queryKeys } from "@/lib/queryKeys";
import type { PostDetail, PostSearchParams } from "@/features/post/types";

// =============================================================================
// 1. Hook Configuration Types
// =============================================================================

interface UsePostPaginationParams {
  searchParams: PostSearchParams;
}

/** 훅 반환 타입 인터페이스 */
export interface UsePostPaginationResult {
  posts: PostDetail[];
  isFetchingNextPage: boolean; // 스크롤 하단 도달 시 추가 데이터를 가져오는 상태
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
}

// =============================================================================
// 2. Hook Implementation
// =============================================================================

/**
 * 게시글 목록 페이징 전용 Suspense Query 훅
 *
 * [상태 추출 및 사이드 이펙트 제어 로직]
 * - `searchParams`를 쿼리 키에 포함하여 필터 조건 변경 시 자동 캐시 분리 및 새 쿼리 생성
 * - `useSuspenseInfiniteQuery`를 활용한 서버 액션(`getPostsListAction`) 호출 및 무한 스크롤 상태 자동화
 * - 평탄화된 게시글 배열(posts) 및 로딩 상태(isFetchingNextPage) 추출 및 반환
 *
 * @param {UsePostPaginationParams} params - 검색 조건 파라미터
 * @returns {UsePostPaginationResult} 페이징 상태 및 추출된 게시글 데이터
 */
export function usePostPagination({
  searchParams,
}: UsePostPaginationParams): UsePostPaginationResult {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: queryKeys.posts.list(searchParams),
      queryFn: async ({ pageParam }) => {
        // 서버 액션 호출 (커서 및 검색 조건 전달)
        return await getPostsListAction(
          pageParam as number | null,
          searchParams
        );
      },
      initialPageParam: null as number | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // 짧은 시간 내의 페이지 이동 시 캐시를 재사용하기 위함
      staleTime: 60 * 1000,
    });

  const posts = data.pages.flatMap((page) => page.posts);

  return {
    posts,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
