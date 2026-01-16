/**
 * File Name : app/(tabs)/profile/[username]/channel/loading
 * Description : 유저 방송국 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.07  임도헌   Created   로딩 스켈레톤 추가
 * 2025.11.13  임도헌   Modified  헤더/히어로/다시보기 섹션 구조로 전면 개편
 * 2026.01.14  임도헌   Modified  UserChannelContainer 구조(Header -> Live -> Grid) 동기화
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 transition-colors">
      {/* 1. UserChannelHeader Skeleton */}
      <div className="mx-auto max-w-3xl w-full px-4 pt-6 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="size-20 rounded-full shrink-0" />{" "}
          {/* Avatar (lg) */}
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-32 rounded-lg" /> {/* Username */}
            {/* Follow Section */}
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-8 w-20 rounded-lg" /> {/* Button */}
            </div>
          </div>
        </div>

        {/* Profile Link Button */}
        <div className="flex justify-center">
          <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
        </div>
      </div>

      <div className="space-y-8">
        {/* 2. LiveNowHero Skeleton */}
        <section className="mx-auto max-w-3xl px-4 w-full">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="size-3 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>

          <div className="rounded-2xl overflow-hidden border border-border bg-surface shadow-sm">
            <div className="aspect-video w-full bg-surface-dim animate-pulse" />{" "}
            {/* Video */}
            <div className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
            </div>
          </div>
        </section>

        {/* 3. RecordingGrid Skeleton */}
        <section className="mx-auto max-w-3xl px-4 w-full">
          <Skeleton className="h-6 w-20 mb-3 rounded-md" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl overflow-hidden border border-border bg-surface shadow-sm"
              >
                <div className="aspect-video w-full bg-surface-dim animate-pulse" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-full rounded" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="size-5 rounded-full" />
                    <Skeleton className="h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
