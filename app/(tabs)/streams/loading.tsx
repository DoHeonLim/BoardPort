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
 * 2026.03.06  임도헌   Modified  실제 스트림 헤더/카드 밀도와 동일한 스켈레톤 구조로 정리
 */

import StreamListSkeleton from "@/features/stream/components/StreamListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
          <Skeleton className="h-11 flex-1 rounded-2xl" />
          <Skeleton className="size-11 rounded-full" />
        </div>
        <div className="border-b border-border/50 px-4 py-2">
          <div className="flex rounded-xl border border-border bg-surface-dim/80 p-1 shadow-sm">
            <Skeleton className="h-10 flex-1 rounded-lg" />
            <Skeleton className="h-10 flex-1 rounded-lg" />
          </div>
        </div>
        <div className="px-4 py-2 overflow-hidden">
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <StreamListSkeleton />
      </div>
    </div>
  );
}
