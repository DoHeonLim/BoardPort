/**
 * File Name : components/post/PostListSkeleton
 * Description : 게시글 목록 로딩 시 보여줄 스켈레톤 목록 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 무한 스크롤용 스켈레톤 목록 구현
 * 2026.01.13  임도헌   Modified  [UI] Grid 레이아웃 지원
 */

"use client";

import PostCardSkeleton from "./PostCardSkeleton";
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
        "grid gap-4",
        viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"
      )}
    >
      {Array.from({ length: count }).map((_, idx) => (
        <PostCardSkeleton key={idx} viewMode={viewMode} />
      ))}
    </div>
  );
}
