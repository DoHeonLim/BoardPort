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
 * 2026.03.06  임도헌   Modified  모바일 그리드 카드 밀도와 동일한 썸네일 비율/메타 구조로 정리
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
        "flex overflow-hidden rounded-2xl border border-border bg-surface shadow-sm",
        isGrid ? "flex-col h-full" : "flex-row h-28 gap-4 sm:h-36"
      )}
    >
      {/* Thumbnail */}
      <div
        className={cn(
          "shrink-0",
          isGrid ? "w-full aspect-[3/2] sm:aspect-[4/3]" : "w-32 h-full"
        )}
      >
        <Skeleton className="w-full h-full" />
      </div>

      {/* Content */}
      <div
        className={cn(
          "flex flex-1 min-w-0",
          isGrid
            ? "flex-col justify-start gap-1.5 p-2 sm:gap-2 sm:p-3"
            : "flex-col justify-between p-3"
        )}
      >
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded-full" />
          <Skeleton className="h-5 w-3/4 rounded" />
          {isGrid && <Skeleton className="h-3 w-24 rounded" />}
        </div>

        <div className={cn("mt-auto", isGrid ? "" : "pt-1")}>
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      </div>
    </div>
  );
}
