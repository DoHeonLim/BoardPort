/**
File Name : app/products/view/[id]/loading
Description : 제품 상세 로딩 페이지
Author : 임도헌

History
Date        Author   Status    Description
2024.10.14  임도헌   Created
2024.10.14  임도헌   Modified  제품 상세 로딩 페이지 추가
2024.12.23  임도헌   Modified  제품 상세 로딩 페이지 아이콘 변경
2025.06.08  임도헌   Modified  제품 상세 로딩 수정
2026.01.11  임도헌   Modified  ProductDetailContainer와 동일한 UI 배치 
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="flex flex-col">
        {/* Image Carousel */}
        <div className="w-full aspect-square sm:aspect-[4/3] bg-surface-dim animate-pulse border-b border-border" />

        {/* Seller Meta */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-3 w-8 rounded" />
            <Skeleton className="size-8 rounded-full" />
          </div>
          <Skeleton className="h-3 w-16 rounded" />
        </div>

        <div className="flex flex-col gap-6 p-6 py-6">
          {/* Header */}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-20 rounded-full" /> {/* Game Type */}
            <Skeleton className="h-8 w-3/4 rounded-lg" /> {/* Title */}
            <Skeleton className="h-7 w-1/3 rounded-lg" /> {/* Price */}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 p-5 rounded-2xl bg-surface-dim border border-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-12 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>

          {/* Tags */}
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 w-full max-w-mobile mx-auto">
        <div className="flex items-center justify-between gap-4 px-4 py-4 bg-surface/95 border-t border-border backdrop-blur">
          <Skeleton className="size-10 rounded-xl shrink-0" /> {/* Like */}
          <Skeleton className="flex-1 h-12 rounded-xl" /> {/* Action Button */}
        </div>
      </div>
    </div>
  );
}
