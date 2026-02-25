/**
 * File Name : app/(tabs)/products/add/loading.tsx
 * Description : 제품 등록 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created   [UI] ProductForm 구조 반영
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background transition-colors">
      {/* Header (Sticky) */}
      <div className="sticky top-0 z-40 h-14 w-full bg-background/80 backdrop-blur-md border-b border-border flex items-center px-4 gap-3">
        <div className="size-10 rounded-xl bg-surface-dim animate-pulse" />{" "}
        {/* Back */}
        <Skeleton className="h-5 w-24 rounded-md" /> {/* Title */}
      </div>

      <div className="flex flex-col gap-5 px-6 py-10 max-w-mobile mx-auto w-full">
        {/* Image Uploader */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="h-32 w-full rounded-xl bg-surface-dim border-2 border-dashed border-border animate-pulse" />
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* Game Type & Price (Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        {/* Players & Time (Grid 3) */}
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
