/**
 * File Name : app/(app)/(tabs)/profile/notifications/list/loading.tsx
 * Description : 알림 목록 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   알림 센터 리스트 구조에 맞는 전용 스켈레톤 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/notifications/list/loading.tsx 에서 app/(app)/(tabs)/profile/notifications/list/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.30  임도헌   Modified  알림 센터 실제 헤더 높이에 맞춰 로딩 헤더 밀도 정리
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pb-24 transition-colors">
      <header className="sticky top-0 z-30 h-[52px] w-full border-b border-border-subtle bg-background shadow-sm">
        <div className="mx-auto flex h-full max-w-mobile items-center gap-3 px-4">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="h-6 w-24 rounded" />
        </div>
      </header>

      <div className="mx-auto w-full max-w-mobile space-y-6 px-page-x py-6">
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Skeleton className="mt-1 size-10 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/5 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-4/5 rounded" />
                  </div>
                </div>
                <Skeleton className="h-3 w-12 rounded" />
              </div>
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


