/**
 * File Name : app/(tabs)/profile/[username]/loading
 * Description : 유저 프로필 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.07  임도헌   Created   로딩 스켈레톤 추가
 * 2025.11.13  임도헌   Modified  UserProfile 섹션 구조에 맞춰 스켈레톤 정비
 * 2026.01.15  임도헌   Modified  UserProfile 구조 재반영
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      <div className="px-page-x py-8 flex flex-col gap-8">
        {/* 1. Header Skeleton (ProfileHeader) */}
        <div className="flex items-start gap-4 sm:gap-5">
          {/* Avatar */}
          <Skeleton className="size-12 sm:size-20 rounded-full shrink-0" />

          {/* Info */}
          <div className="flex-1 space-y-3 py-1 min-w-0">
            {/* Username */}
            <Skeleton className="h-6 sm:h-7 w-32 rounded-lg" />
            {/* Join Date */}
            <Skeleton className="h-4 w-24 rounded" />

            {/* Rating */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="size-3.5 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-4 w-12 rounded" />
            </div>

            {/* Follow Stats & Button */}
            <div className="flex flex-wrap gap-3 mt-1 items-center">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
              {/* Follow Button */}
              <Skeleton className="h-8 w-20 rounded-lg ml-auto sm:ml-0" />
            </div>
          </div>
        </div>

        {/* 2. Channel (Rail Layout) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          {/* Rail Cards */}
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map((i) => (
              <div key={i} className="w-[200px] shrink-0 space-y-2">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* 3. Reviews & Badges */}
        <div className="flex flex-col gap-8">
          {/* Reviews */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          </div>

          {/* Badges (Direct List) */}
          <div className="space-y-3">
            {/* Title only */}
            <Skeleton className="h-5 w-24 rounded" />

            {/* Badge List (Horizontal Scroll) */}
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="size-[84px] rounded-xl shrink-0" />
              ))}
            </div>
          </div>
        </div>

        {/* 4. Products Tab (Sales) */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-20 rounded" />
          <div className="p-4 rounded-xl border border-border bg-surface">
            {/* Tabs */}
            <div className="flex gap-1 mb-4 bg-surface-dim rounded-lg p-1">
              <Skeleton className="h-9 flex-1 rounded-md" />
              <Skeleton className="h-9 flex-1 rounded-md" />
            </div>

            {/* View Toggle */}
            <div className="flex justify-end gap-1 mb-3">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="size-8 rounded-md" />
            </div>

            {/* List Items */}
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex gap-4 p-3 border border-border rounded-xl"
                >
                  <Skeleton className="size-24 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-4 w-1/3 rounded" />
                    <div className="flex gap-2 mt-auto pt-2">
                      <Skeleton className="h-4 w-12 rounded" />
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
