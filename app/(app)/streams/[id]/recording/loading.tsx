/**
 * File Name : app/(app)/streams/[id]/recording/loading.tsx
 * Description : 녹화본 상세 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.13  임도헌   Created
 * 2026.03.12  임도헌   Modified  flat 헤더 톤과 현재 녹화본 상세/댓글 영역 밀도에 맞춰 스켈레톤 정리
 * 2026.03.17  임도헌   Modified  영상 패널/메타 패널/댓글 패널 구조에 맞춰 로딩 레이아웃 재정렬
 * 2026.03.29  임도헌   Modified  RecordingTopbar의 카테고리 칩/공유/옵션 버튼 구조에 맞춰 상단 스켈레톤 보강
 * 2026.04.12  임도헌   Moved     파일 경로를 app/streams/[id]/recording/loading.tsx 에서 app/(app)/streams/[id]/recording/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Topbar */}
      <div className="flex h-14 w-full items-center justify-between border-b border-border-subtle bg-background px-3 shadow-sm sm:px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="hidden h-8 w-16 rounded-full sm:block" />
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </div>

      <main className="mx-auto flex w-full max-w-mobile flex-1 flex-col items-center gap-6 px-4 py-6 pb-20">
        <div className="w-full overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
          <Skeleton className="aspect-video w-full" />
        </div>

        <div className="w-full rounded-2xl border border-border-subtle bg-surface px-4 py-4 shadow-sm sm:px-5">
          <div className="space-y-4">
            <Skeleton className="h-7 w-3/4 rounded" />
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </div>
            <div className="border-t border-border-subtle pt-4">
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>
            </div>
          </div>
        </div>

        <div className="w-full rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-6 w-20 rounded" />
          </div>

          <div className="mb-5 rounded-2xl border border-border-subtle bg-background/70 p-3">
            <div className="flex items-end gap-2">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="h-12 flex-1 rounded-2xl" />
              <Skeleton className="size-10 rounded-full" />
            </div>
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-4 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

