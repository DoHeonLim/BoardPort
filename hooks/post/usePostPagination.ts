/**
 * File Name : hooks/post/usePostPagination.ts
 * Description : 게시글 무한 스크롤을 위한 커서 기반 페이지네이션 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 무한 스크롤 훅 생성
 * 2025.07.04  임도헌   Modified  검색 파라미터 대응 및 상태 초기화 추가
 * 2026.01.16  임도헌   Moved     hooks -> hooks/post
 */
"use client";

import { useCallback, useState } from "react";
import { getMorePosts } from "@/app/(tabs)/posts/actions/init";
import { PostDetail } from "@/types/post";

interface UsePostPagination {
  initialPosts: PostDetail[];
  initialCursor: number | null;
  searchParams: Record<string, string>; // 검색 조건 추가
}

interface UsePostPaginationResult {
  posts: PostDetail[];
  cursor: number | null;
  isLoading: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reset: () => void; // 초기화 메서드 추가
}

/**
 * 게시글 목록을 커서 기반으로 페이지네이션 처리하기 위한 커스텀 훅.
 * - 게시글 데이터를 받아오고, 다음 데이터를 불러올 수 있는 커서 정보를 상태로 관리.
 * - 무한 스크롤 기반의 페이징을 구현할 수 있도록 `useInfiniteScroll` 훅과 함께 사용.
 */
export function usePostPagination({
  initialPosts,
  initialCursor,
  searchParams,
}: UsePostPagination): UsePostPaginationResult {
  const [posts, setPosts] = useState(initialPosts);
  const [cursor, setCursor] = useState(initialCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialCursor !== null);

  const loadMore = async () => {
    if (isLoading || !hasMore) return;
    setIsLoading(true);
    try {
      const newData = await getMorePosts(cursor, searchParams); // 검색 조건 전달
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
