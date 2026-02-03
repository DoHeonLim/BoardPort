/**
 * File Name : app/(tabs)/products/@modal/(..)products/view/[id]/loading.tsx
 * Description : 모달 제품 상세 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.22  임도헌   Created
 * 2024.10.22  임도헌   Modified  로딩 페이지 추가
 * 2024.12.11  임도헌   Modified  캐러셀 스켈레톤 추가
 * 2025.05.05  임도헌   Modified  로딩 UI 변경
 * 2025.06.08  임도헌   Modified  모달 상세 페이지 로딩 수정
 * 2025.06.12  임도헌   Modified  app/(tabs)/products/@modal/(..)products/view/[id]/loading 로 이동
 * 2026.01.11  임도헌   Modified  [Rule 3.2] 반응형 스켈레톤 & 시맨틱 토큰 적용
 */

import CloseButton from "@/components/global/CloseButton";
import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div
        className={cn(
          "flex flex-col overflow-hidden bg-background shadow-2xl transition-all outline-none",
          // [Mobile] Full Screen, [Desktop] Center Card
          "w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-screen-sm sm:rounded-2xl sm:border sm:border-border"
        )}
      >
        {/* Header (Close) */}
        <div className="flex justify-end p-2 shrink-0">
          <CloseButton className="pointer-events-none opacity-50" />
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
          {/* Image */}
          <div className="w-full aspect-square sm:aspect-[4/3] bg-surface-dim animate-pulse border-b border-border" />

          {/* Seller */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-3 w-8 rounded" />
              <Skeleton className="size-8 rounded-full" />
            </div>
            <Skeleton className="h-3 w-16 rounded" />
          </div>

          <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="space-y-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="h-7 w-1/3 rounded-lg" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-surface-dim border border-border">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
