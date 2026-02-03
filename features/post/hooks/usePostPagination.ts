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
 */
"use client";

import { useCallback, useState } from "react";
import { getMorePosts } from "@/features/post/actions/list";
import type { PostDetail } from "@/features/post/types";

interface UsePostPaginationParams {
  initialPosts: PostDetail[];
  initialCursor: number | null;
  searchParams: Record<string, string>; // 검색 조건 (keyword, category)
}

interface UsePostPaginationResult {
  posts: PostDetail[];
  cursor: number | null;
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reset: () => void;
}

/**
 * 게시글 목록 페이징 훅
 *
 * [기능]
 * 1. 초기 데이터(SSR)를 상태로 관리
 * 2. 커서 기반 추가 데이터 로드 (`getMorePosts` 액션 호출)
 * 3. 검색 조건 변경 시 목록 리셋 기능 (`reset`)
 *
 * @param {UsePostPaginationParams} params - 초기 데이터 및 검색 조건
 */
export function usePostPagination({
  initialPosts,
  initialCursor,
  searchParams,
}: UsePostPaginationParams): UsePostPaginationResult {
  // --- State ---
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialCursor !== null);

  /**
   * 추가 데이터 로드
   * - 현재 커서를 기준으로 다음 페이지 데이터를 요청합니다.
   * - 검색 조건(searchParams)을 함께 전송하여 필터링된 목록을 유지합니다.
   */
  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);

    try {
      // Server Action 호출
      const newData = await getMorePosts(cursor, searchParams);

      if (newData.posts.length > 0) {
        setPosts((prev) => [...prev, ...newData.posts]);
      }

      setCursor(newData.nextCursor);
      setHasMore(newData.nextCursor !== null);
    } catch (error) {
      console.error("Failed to load more posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 목록 초기화
   * - 검색 조건이 변경되거나 탭이 바뀔 때, 상태를 초기값으로 되돌립니다.
   */
  const reset = useCallback(() => {
    setPosts(initialPosts);
    setCursor(initialCursor);
    setHasMore(initialCursor !== null);
  }, [initialPosts, initialCursor]);

  return {
    posts,
    cursor,
    isLoading,
    hasMore,
    loadMore,
    reset,
  };
}
