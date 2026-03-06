/**
 * File Name : features/post/components/PostListSkeleton.tsx
 * Description : 게시글 목록 로딩 시 보여줄 스켈레톤 목록 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 무한 스크롤용 스켈레톤 목록 구현
 * 2026.01.13  임도헌   Modified  [UI] Grid 레이아웃 지원
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 * 2026.03.06  임도헌   Modified  실제 카드 간격과 동일한 grid gap 규칙으로 정리
 */

"use client";

import PostCardSkeleton from "@/features/post/components/PostCardSkeleton";
import { cn } from "@/lib/utils";

interface PostListSkeletonProps {
  viewMode: "list" | "grid";
  count?: number;
}

export default function PostListSkeleton({
  viewMode,
  count = 4,
}: PostListSkeletonProps) {
  return (
    <div
      className={cn(
        viewMode === "grid"
          ? "grid grid-cols-2 gap-3 sm:gap-4"
          : "grid grid-cols-1 gap-4"
      )}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <PostCardSkeleton key={idx} viewMode={viewMode} />
      ))}
    </div>
  );
}
