/**
 * File Name : features/post/components/PostList.tsx
 * Description : 게시글 목록 렌더링
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 목록 렌더링 컴포넌트 구현
 * 2025.07.04  임도헌   Modified  검색 조건 변경 시 상태 초기화
 * 2025.08.26  임도헌   Modified  usePageVisibility + 새 useInfiniteScroll 옵션 추가
 * 2025.08.26  임도헌   Modified  UI 충돌 수정(grid + flex 동시 적용 가능성)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 뷰 모드 토글 스타일 통일
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.01.27  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

"use client";

import { useRef, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { usePostPagination } from "@/features/post/hooks/usePostPagination";
import PostListSkeleton from "@/features/post/components/PostListSkeleton";
import PostCard from "@/features/post/components/postCard";
import { ListBulletIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { PostDetail } from "@/features/post/types";
import { cn } from "@/lib/utils";

interface PostListProps {
  initialPosts: PostDetail[];
  nextCursor: number | null;
}

export default function PostList({ initialPosts, nextCursor }: PostListProps) {
  const searchParams = useSearchParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const isVisible = usePageVisibility();

  const { posts, isLoading, hasMore, loadMore, reset } = usePostPagination({
    initialPosts,
    initialCursor: nextCursor,
    searchParams: Object.fromEntries(searchParams.entries()), // 현재 검색 조건 전달
  });

  const triggerRef = useRef<HTMLDivElement | null>(null);

  useInfiniteScroll({
    triggerRef,
    hasMore,
    isLoading,
    onLoadMore: loadMore,
    enabled: isVisible, // 탭이 백그라운드면 로딩 중단
    rootMargin: "1000px 0px 0px 0px", // 조기 프리패치 여유
    threshold: 0.01,
  });

  // 검색 조건 변경 시 상태 초기화
  useEffect(() => {
    reset();
  }, [searchParams, reset]);

  return (
    <>
      {/* 뷰 모드 전환 버튼 (Segmented Control Style) */}
      <div className="flex justify-end mb-4">
        <div className="flex p-1 bg-surface-dim rounded-lg border border-border">
          <button
            onClick={() => setViewMode("list")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "list"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand dark:text-brand-light"
                : "text-muted hover:text-primary"
            )}
            aria-label="리스트 뷰"
          >
            <ListBulletIcon className="size-5" />
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={cn(
              "p-1.5 rounded-md transition-all",
              viewMode === "grid"
                ? "bg-white dark:bg-gray-700 shadow-sm text-brand dark:text-brand-light"
                : "text-muted hover:text-primary"
            )}
            aria-label="그리드 뷰"
          >
            <Squares2X2Icon className="size-5" />
          </button>
        </div>
      </div>

      {/* 목록 렌더링 */}
      <div
        className={cn(
          "grid gap-4",
          viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {posts.map((post) => (
          <PostCard key={post.id} post={post} viewMode={viewMode} />
        ))}
      </div>

      {isLoading && <PostListSkeleton viewMode={viewMode} />}

      <div ref={triggerRef} className="h-8" aria-hidden="true" tabIndex={-1} />
    </>
  );
}
