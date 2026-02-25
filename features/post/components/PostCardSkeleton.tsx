/**
 * File Name : features/post/components/PostCardSkeleton.tsx
 * Description : 게시글 카드 로딩용 스켈레톤 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   게시글 카드 스켈레톤 컴포넌트 구현
 * 2026.01.13  임도헌   Modified  [UI] PostCard 구조와 일치 및 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/post -> features/post/components
 */
"use client";

import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

interface PostCardSkeletonProps {
  viewMode: "list" | "grid";
}

export default function PostCardSkeleton({ viewMode }: PostCardSkeletonProps) {
  const isGrid = viewMode === "grid";

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-2xl border border-border bg-surface p-4",
        isGrid ? "flex-col h-full gap-3" : "flex-row gap-4 h-32 sm:h-36"
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "shrink-0",
          isGrid ? "w-full aspect-[4/3]" : "size-24 sm:size-28"
        )}
      >
        <Skeleton className="w-full h-full rounded-xl" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" /> {/* Category */}
          <Skeleton className="h-5 w-3/4 rounded" /> {/* Title */}
        </div>

        <div className="flex flex-col gap-2 mt-auto">
          {!isGrid && <Skeleton className="h-4 w-1/2 rounded" />} {/* Tags */}
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-24 rounded" /> {/* Meta */}
          </div>
        </div>
      </div>
    </div>
  );
}
