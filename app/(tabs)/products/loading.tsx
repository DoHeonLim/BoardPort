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
 * 2026.03.11  임도헌   Modified  신규 2단 제품 헤더 구조와 디자인 토큰(border-subtle)에 맞춘 스켈레톤으로 재정렬
 * 2026.03.12  임도헌   Modified  제품 로딩 탭 외곽선을 border-border-subtle 기준으로 통일
 */

import ProductListSkeleton from "@/features/product/components/ProductListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24 transition-colors">
      <div className="md:hidden">
        <header className="border-b border-border-subtle bg-background px-3 pt-2 pb-2 shadow-sm">
          <div className="flex items-center gap-2 py-1">
            <Skeleton className="h-10 w-20 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-10 w-14 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-11 rounded-xl" />
          </div>
        </header>
      </div>

      <header className="sticky top-0 z-30 hidden border-b border-border-subtle bg-background shadow-sm md:block">
        <div className="mx-auto max-w-5xl px-5 pt-3 pb-3 lg:px-6">
          <div className="flex items-center gap-3 py-1">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Skeleton className="h-10 w-20 rounded-xl" />
            <Skeleton className="h-11 flex-1 rounded-2xl" />
            <Skeleton className="h-11 w-20 rounded-xl" />
          </div>
        </div>
      </header>

      <div className="flex-1 px-page-x py-6">
        <div className="flex items-center justify-between mb-4 px-1">
          <Skeleton className="h-5 w-28 rounded-lg" />
          <div className="flex rounded-xl border border-border-subtle bg-surface-dim/80 p-1 shadow-sm">
            <Skeleton className="size-11 rounded-lg" />
            <Skeleton className="size-11 rounded-lg" />
          </div>
        </div>
        <ProductListSkeleton viewMode="list" />
      </div>
    </div>
  );
}
