/**
 * File Name : app/(tabs)/profile/loading.tsx
 * Description : 내 프로필 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.07  임도헌   Created    로딩 스켈레톤 추가
 * 2025.10.29  임도헌   Modified   MyProfile 최신 레이아웃과 일치하도록 전면 수정(그라디언트/액션버튼/방송국/뱃지/카드 구성)
 * 2025.11.13  임도헌   Modified   MyProfile 섹션 구조에 맞춰 스켈레톤 정비
 * 2026.01.15  임도헌   Modified   MyProfile 구조 재반영
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      {/* Top Actions Placeholder */}
      <div className="flex justify-end gap-2 px-page-x py-3">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="size-10 rounded-xl" />
      </div>

      <div className="px-page-x pt-2 flex flex-col gap-8 pb-10">
        {/* 1. Header Skeleton */}
        <div className="flex items-start gap-4 sm:gap-5">
          {/* Avatar */}
          <Skeleton className="size-12 sm:size-20 rounded-full shrink-0" />

          {/* Info */}
          <div className="flex-1 space-y-3 py-1 min-w-0">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 sm:h-7 w-32 rounded-lg" /> {/* Name */}
            </div>
            <Skeleton className="h-4 w-24 rounded" /> {/* Date */}
            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="size-4 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-4 w-12 rounded" />
            </div>
            {/* Follow Stats */}
            <div className="flex gap-3 mt-1">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          </div>
        </div>

        {/* 2. Notification Settings */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <div className="h-16 w-full rounded-xl bg-surface border border-border" />
        </div>

        {/* 3. Trade Info (Grid) */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-24 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 w-full rounded-xl bg-surface border border-border" />
            <Skeleton className="h-24 w-full rounded-xl bg-surface border border-border" />
          </div>
        </div>

        {/* 4. Channel (Rail) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map((i) => (
              <div key={i} className="w-[200px] shrink-0 space-y-2">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Reviews & Badges */}
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="size-[84px] rounded-xl shrink-0" />
              ))}
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-6 border-t border-border">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
