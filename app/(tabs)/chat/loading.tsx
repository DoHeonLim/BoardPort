/**
 * File Name : app/(tabs)/chat/loading
 * Description : 채팅 목록 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.12  임도헌   Created   [UX] 채팅 목록 스켈레톤 추가
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-3 px-page-x py-6 w-full max-w-mobile mx-auto min-h-screen bg-background">
      {/* Title */}
      <div className="flex items-center gap-2 mb-2 px-1">
        <Skeleton className="h-7 w-12 rounded-md" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>

      {/* List Skeletons */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-surface shadow-sm"
          >
            {/* Thumbnail */}
            <Skeleton className="size-12 sm:size-14 rounded-xl shrink-0" />

            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <div className="flex justify-between items-start">
                {/* Username */}
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
                {/* Time */}
                <Skeleton className="h-3 w-10 rounded" />
              </div>
              {/* Last Message */}
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
