/**
 * File Name : app/(tabs)/streams/loading.tsx
 * Description : 스트리밍 탭 로딩
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.21  임도헌   Created
 * 2025.05.21  임도헌   Modified  라이브 스트리밍 로딩 페이지 추가
 * 2026.01.14  임도헌   Modified  탭/검색창/리스트 스켈레톤 적용
 */

import StreamListSkeleton from "@/features/stream/components/StreamListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm p-3 sm:p-4 h-[116px] flex flex-col gap-4">
        {/* Tabs */}
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
          ))}
        </div>
        {/* Search & Scope */}
        <div className="flex justify-between items-center gap-4">
          <Skeleton className="h-10 flex-1 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
      </div>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <StreamListSkeleton />
      </div>
    </div>
  );
}
