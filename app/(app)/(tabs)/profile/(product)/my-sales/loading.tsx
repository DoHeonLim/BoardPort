/**
 * File Name : app/(app)/(tabs)/profile/(product)/my-sales/loading.tsx
 * Description : 나의 판매 제품 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.07  임도헌   Created   로딩 스켈레톤 추가
 * 2025.11.13  임도헌   Modified  현재 UI(탭+카드+액션) 구조와 톤으로 재정렬
 * 2026.01.16  임도헌   Modified  [UI] 탭 UI 및 ProductCard 스타일 스켈레톤 적용
 * 2026.03.12  임도헌   Modified  프로필 판매 내역 스켈레톤 구분선을 border-border-subtle 톤으로 통일
 * 2026.03.17  임도헌   Modified  현재 판매 카드 하단 액션 밀도에 맞춰 액션 영역 두께와 대비 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/(product)/my-sales/loading.tsx 에서 app/(app)/(tabs)/profile/(product)/my-sales/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.17  임도헌   Modified  실카드와 맞춰 태그-메타 사이 구분선을 제거하고 간격만 유지하도록 스켈레톤 리듬 정리
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="px-page-x py-6 flex flex-col">
        {/* Tabs Skeleton */}
        <div className="mb-6 flex rounded-xl border border-border-subtle bg-surface-dim p-1">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg bg-transparent" />
          <Skeleton className="h-9 flex-1 rounded-lg bg-transparent" />
        </div>

        {/* View Toggle */}
        <div className="flex justify-end gap-2 mb-3">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="size-9 rounded-lg" />
        </div>

        {/* List Skeleton */}
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm"
            >
              <div className="flex p-4 gap-4">
                {/* Thumbnail */}
                <Skeleton className="size-24 sm:size-28 rounded-xl shrink-0" />

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-5 w-3/4 rounded" />
                      <Skeleton className="h-5 w-14 rounded" />
                    </div>
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <Skeleton className="h-4 w-12 rounded" />
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="flex gap-2">
                        <Skeleton className="h-3 w-8 rounded" />
                        <Skeleton className="h-3 w-8 rounded" />
                      </div>
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 하단 액션 영역 */}
              <div className="flex h-9 items-center justify-center border-t border-border-subtle bg-surface-dim/20">
                <Skeleton className="h-4 w-24 rounded bg-border-subtle" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


