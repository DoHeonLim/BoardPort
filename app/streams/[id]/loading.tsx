/**
 * File Name : app/streams/[id]/loading.tsx
 * Description : 라이브 상세 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created   라이브 상세 로딩 페이지 추가
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Topbar */}
      <div className="h-14 w-full border-b border-border bg-surface flex items-center px-4 justify-between">
        <div className="flex items-center gap-2">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>

      <div className="flex-1 xl:grid xl:grid-cols-[1fr,min(100%,1000px),360px] xl:gap-4 xl:p-4">
        <div className="hidden xl:block" />

        {/* Main Content */}
        <div className="w-full space-y-4">
          {/* Player */}
          <div className="aspect-video w-full bg-black/10 dark:bg-white/5 rounded-lg animate-pulse" />

          {/* Info Panel */}
          <div className="p-4 rounded-xl border border-border bg-surface space-y-4">
            <Skeleton className="h-6 w-3/4 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
          </div>
        </div>

        {/* Chat Sidebar (Desktop) */}
        <div className="hidden xl:block h-[calc(100vh-100px)] rounded-xl border border-border bg-surface p-4">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
