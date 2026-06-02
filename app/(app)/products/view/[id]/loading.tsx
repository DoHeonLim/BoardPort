/**
 * File Name : app/(app)/products/view/[id]/loading.tsx
 * Description : 제품 상세 로딩 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.14  임도헌   Created
 * 2024.10.14  임도헌   Modified  제품 상세 로딩 페이지 추가
 * 2024.12.23  임도헌   Modified  제품 상세 로딩 페이지 아이콘 변경
 * 2025.06.08  임도헌   Modified  제품 상세 로딩 수정
 * 2026.01.11  임도헌   Modified  ProductDetailContainer와 동일한 UI 배치
 * 2026.03.12  임도헌   Modified  flat 하단 액션바 톤과 현재 제품 상세 정보 카드 밀도에 맞춰 스켈레톤 정리
 * 2026.03.29  임도헌   Modified  실제 상세 헤더와 거래 장소 섹션 순서에 맞춰 제품 상세 스켈레톤 정합성 보강
 * 2026.04.12  임도헌   Moved     파일 경로를 app/products/view/[id]/loading.tsx 에서 app/(app)/products/view/[id]/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.30  임도헌   Modified  제품 상세 실제 헤더 높이에 맞춰 로딩 헤더 밀도 정리
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="relative flex min-h-full flex-col bg-background transition-colors">
      <header className="sticky top-0 z-40 h-[52px] w-full border-b border-border-subtle bg-background shadow-sm transition-colors">
        <div className="mx-auto flex h-full max-w-mobile items-center justify-between px-4">
          <Skeleton className="size-9 rounded-full" />

          <div className="flex items-center gap-2">
            <Skeleton className="hidden h-8 w-20 rounded-full xs:block" />
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="size-9 rounded-full" />
          </div>
        </div>
      </header>

      <div className="flex-1 pb-4">
        {/* 이미지 캐러셀 */}
        <Skeleton className="aspect-square w-full border-b border-border-subtle sm:aspect-[4/3]" />

        {/* 판매자 메타 정보 */}
        <div className="flex items-center justify-between border-b border-border-subtle bg-background px-6 py-3">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-3 w-8 rounded" />
            <Skeleton className="size-8 rounded-full" />
          </div>
          <Skeleton className="h-3 w-16 rounded" />
        </div>

        <div className="flex flex-col gap-6 p-6 py-6">
          {/* 헤더 */}
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-8 w-3/4 rounded-lg" />
            <Skeleton className="h-7 w-1/3 rounded-lg" />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-2/3 rounded" />
          </div>

          {/* 정보 그리드 */}
          <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border-subtle bg-surface-dim p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-12 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>

          {/* 위치 */}
          <section className="mt-2 border-t border-border-subtle py-2 pt-6">
            <Skeleton className="mb-3 h-4 w-24 rounded" />
            <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
              <Skeleton className="aspect-[16/10] w-full rounded-none" />
            </div>
          </section>

          {/* 태그 */}
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* 하단 액션 바 스켈레톤 (고정) */}
      <div className="sticky bottom-0 z-40 mt-auto w-full border-t border-border-subtle bg-background px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-[0_-8px_20px_rgba(15,23,42,0.06)]">
        <div className="mx-auto flex max-w-mobile items-center justify-between gap-4">
          <Skeleton className="size-10 rounded-xl shrink-0" /> {/* 좋아요 */}
          <div className="flex-1 flex gap-3 h-12">
            <Skeleton className="h-full flex-1 rounded-xl" />
            <Skeleton className="h-full flex-1 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

