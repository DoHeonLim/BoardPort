/**
 * File Name : app/(app)/streams/[id]/loading.tsx
 * Description : 방송 상세 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created   방송 상세 로딩 페이지 추가
 * 2026.03.12  임도헌   Modified  flat 헤더 톤과 현재 방송 상세 레이아웃 밀도에 맞춰 스켈레톤 정리
 * 2026.03.29  임도헌   Modified  StreamTopbar의 뒤로가기/가시성 칩/액션 버튼 구조에 맞춰 상단 스켈레톤 재정렬
 * 2026.04.12  임도헌   Moved     파일 경로를 app/streams/[id]/loading.tsx 에서 app/(app)/streams/[id]/loading.tsx 로 변경 (라우트 그룹 개편)
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Topbar */}
      <div className="flex h-14 w-full items-center justify-between border-b border-border-subtle bg-background px-3 shadow-sm sm:px-4 lg:px-6">
        <div className="flex items-center gap-2">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </div>

      <div className="flex-1 xl:grid xl:grid-cols-[1fr,min(100%,1000px),360px] xl:gap-4 xl:p-4">
        <div className="hidden xl:block" />

        {/* Main Content */}
        <div className="w-full space-y-4">
          {/* Player */}
          <Skeleton className="aspect-video w-full rounded-none lg:rounded-lg" />

          {/* Info Panel */}
          <div className="space-y-4 rounded-xl border border-border-subtle bg-surface p-4">
            <Skeleton className="h-6 w-3/4 rounded" />
            <div className="flex items-center gap-2">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
          </div>
        </div>

        {/* Chat Sidebar (Desktop) */}
        <div className="hidden h-[calc(100vh-100px)] rounded-xl border border-border-subtle bg-surface p-4 xl:block">
          <Skeleton className="h-full w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

