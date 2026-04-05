/**
 * File Name : app/(tabs)/profile/[username]/channel/loading.tsx
 * Description : 유저 방송국 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.07  임도헌   Created   로딩 스켈레톤 추가
 * 2025.11.13  임도헌   Modified  헤더/히어로/다시보기 섹션 구조로 전면 개편
 * 2026.01.14  임도헌   Modified  UserChannelContainer 구조(Header -> Live -> Grid) 동기화
 * 2026.03.17  임도헌   Modified  채널 히어로/다시보기 패널 톤과 축소된 카드 밀도 기준으로 스켈레톤 재정렬
 * 2026.03.29  임도헌   Modified  최신 채널 헤더의 압축된 패딩과 소개/팔로우 밀도에 맞춰 스켈레톤 간격 조정
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-20 transition-colors">
      {/* 1. UserChannelHeader Skeleton */}
      <div className="mx-auto max-w-3xl w-full px-4 pt-4 pb-5 sm:pt-6 sm:pb-6">
        <div className="rounded-2xl border border-border-subtle bg-surface px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <Skeleton className="size-20 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="h-4 w-full max-w-[22rem] rounded" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-center sm:mt-5">
            <Skeleton className="h-10 w-full max-w-sm rounded-xl" />
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* 2. LiveNowHero Skeleton */}
        <section className="mx-auto max-w-3xl px-4 w-full">
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2">
              <Skeleton className="size-3 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-md" />
            </div>
            <Skeleton className="h-4 w-64 rounded" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
            <div className="aspect-video w-full bg-surface-dim animate-pulse" />
            <div className="border-t border-border-subtle p-4 space-y-3">
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          </div>
        </section>

        {/* 3. RecordingGrid Skeleton */}
        <section className="mx-auto max-w-3xl px-4 w-full">
          <div className="mb-4 space-y-2">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-4 w-56 rounded" />
          </div>

          <div className="rounded-2xl border border-border-subtle bg-surface p-3 shadow-sm sm:p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-border-subtle bg-background shadow-sm"
                >
                  <div className="aspect-video w-full bg-surface-dim animate-pulse" />
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <div className="flex gap-2 pt-1">
                      <Skeleton className="size-5 rounded-full" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                    <div className="pt-1">
                      <Skeleton className="h-3 w-24 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
