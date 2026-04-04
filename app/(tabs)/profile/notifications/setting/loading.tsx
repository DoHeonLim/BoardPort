/**
 * File Name : app/(tabs)/profile/notifications/setting/loading.tsx
 * Description : 알림 설정 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.15  임도헌   Created   알림 설정 폼 구조 반영
 * 2026.03.12  임도헌   Modified  flat 헤더 톤과 현재 알림 설정 카드 밀도에 맞춰 스켈레톤 정리
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      {/* Header Skeleton */}
      <div className="flex h-14 items-center gap-3 border-b border-border-subtle bg-background px-4 shadow-sm">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-6 w-24 rounded" />
      </div>

      <div className="mx-auto w-full max-w-mobile px-page-x py-6 flex flex-col gap-8">
        {/* 1. Push Toggle */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="h-20 w-full rounded-xl border border-border-subtle bg-surface" />
        </div>

        {/* 2. Notification Types */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="overflow-hidden rounded-xl border border-border-subtle bg-surface">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-border-subtle p-4 last:border-none"
              >
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                </div>
                <Skeleton className="size-5 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* 3. Quiet Hours */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <div className="rounded-xl border border-border-subtle bg-surface p-4">
            <Skeleton className="h-3 w-full max-w-sm mb-4 rounded" />
            <div className="flex gap-2 items-center">
              <Skeleton className="h-12 flex-1 rounded-xl" />
              <span className="text-muted">~</span>
              <Skeleton className="h-12 flex-1 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Button */}
        <div className="pt-2">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
