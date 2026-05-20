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
 * 2026.03.12  임도헌   Modified  currentRange를 포함한 게시글 무한스크롤 캐시 분리 규칙 명확화
 * 2026.03.12  임도헌   Modified  currentRange 전환 시 stale 방지를 위한 queryKeyExtra 분기 설명 추가
 * 2026.03.14  임도헌   Modified  첫 페이지 totalCount를 노출해 무한스크롤 중에도 총 게시글 수를 고정 표시
 * 2026.04.17  임도헌   Modified  Suspense 무한스크롤 훅의 캐시 분리/반환 책임이 주석에서 바로 드러나도록 설명 보강
 * 2026.05.19  임도헌   Modified  Client queryFn 초기 렌더의 조회용 Server Action 호출 오류를 피하도록 Route Handler fetch로 전환
 */
"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import type {
  PostDetail,
  PostSearchParams,
  PostsPage,
} from "@/features/post/types";

// =============================================================================
// 1. Hook Configuration Types
// =============================================================================

interface UsePostPaginationParams {
  searchParams: PostSearchParams;
  queryKeyExtra?: unknown;
}

/** 훅 반환 타입 */
export interface UsePostPaginationResult {
  posts: PostDetail[];
  totalCount?: number;
  isFetchingNextPage: boolean; // 다음 페이지 로딩 상태
  hasMore: boolean;
  loadMore: () => Promise<unknown>;
}

/**
 * 게시글 목록 API URL 생성
 *
 * @param searchParams - 게시글 검색 조건
 * @param cursor - 다음 페이지 커서
 * @returns 게시글 목록 API URL
 */
function buildPostsApiUrl(
  searchParams: PostSearchParams,
  cursor: number | null
) {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", String(cursor));
  if (searchParams.keyword) params.set("keyword", searchParams.keyword);
  if (searchParams.category) params.set("category", searchParams.category);

  const queryString = params.toString();
  return queryString ? `/api/posts?${queryString}` : "/api/posts";
}

/**
 * 게시글 목록 API 조회
 * Client Component queryFn에서는 Server Action 직접 호출 대신 HTTP fetch를 사용해 초기 렌더 fetch waterfall 오류를 방지
 *
 * @param url - 호출할 Route Handler URL
 * @returns 게시글 목록 페이지 응답
 */
async function fetchPostsPage(url: string): Promise<PostsPage> {
  const response = await fetch(url, {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    throw new Error("게시글 목록을 불러오지 못했습니다.");
  }

  return response.json();
}

// =============================================================================
// 2. Hook Implementation
// =============================================================================

/**
 * 게시글 목록 Suspense 무한 스크롤 훅
 *
 * [기능]
 * - `searchParams`를 queryKey에 반영해 게시판/카테고리/검색어 조합별 캐시를 분리
 * - `queryKeyExtra`로 같은 검색 조건 안에서도 currentRange 같은 보조 범위를 추가 분리
 * - `useSuspenseInfiniteQuery`와 게시글 목록 Route Handler를 연결해 Client queryFn의 Server Action 직접 호출을 피하고 다음 페이지를 커서 기반으로 조회
 * - 평탄화된 posts 배열과 첫 페이지 totalCount를 함께 반환해 목록/헤더가 같은 데이터를 공유하도록 구성
 *
 * @param {UsePostPaginationParams} params - 검색 조건과 추가 캐시 분리 스코프
 * @returns {UsePostPaginationResult} 평탄화된 게시글 목록과 총 개수, 무한 스크롤 제어값
 */
export function usePostPagination({
  searchParams,
  queryKeyExtra,
}: UsePostPaginationParams): UsePostPaginationResult {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey: queryKeys.posts.list({
        ...searchParams,
        __scope: queryKeyExtra,
      }),
      queryFn: async ({ pageParam }) => {
        // Client queryFn의 Server Action 직접 호출은 초기 렌더 waterfall 오류가 날 수 있어 Route Handler fetch 사용
        return fetchPostsPage(
          buildPostsApiUrl(searchParams, pageParam as number | null)
        );
      },
      initialPageParam: null as number | null,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      // 짧은 시간 내의 페이지 이동 시 캐시를 재사용하기 위함
      staleTime: 60 * 1000,
    });

  const posts = data.pages.flatMap((page) => page.posts);
  // 첫 페이지 totalCount 유지로 다음 페이지 추가 로드 후에도 상단 개수 표시 흔들림 방지
  const totalCount = data.pages[0]?.totalCount;

  return {
    posts,
    totalCount,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
  };
}
