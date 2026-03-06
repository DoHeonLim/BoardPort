/**
 * File Name : app/(tabs)/products/loading.tsx
 * Description : 제품 로딩 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  제품 로딩 페이지 추가
 * 2025.06.08  임도헌   Modified  제품 목록 로딩 수정
 * 2026.01.10  임도헌   Modified  로딩 재수정
 * 2026.03.06  임도헌   Modified  실제 제품 헤더/카드 밀도와 동일한 스켈레톤 구조로 정리
 */

import ProductListSkeleton from "@/features/product/components/ProductListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 transition-colors">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm transition-colors">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
        <div className="px-4 py-3">
          <div className="flex gap-3">
            <Skeleton className="size-11 rounded-2xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
          </div>
        </div>
      </header>

      <div className="flex-1 px-page-x py-6">
        <div className="flex items-center justify-between mb-4 px-1">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <div className="flex rounded-xl border border-border bg-surface-dim/80 p-1 shadow-sm">
            <Skeleton className="size-11 rounded-lg" />
            <Skeleton className="size-11 rounded-lg" />
          </div>
        </div>
        <ProductListSkeleton viewMode="list" />
      </div>
    </div>
  );
}
