/**
 * File Name : app/(app)/products/view/[id]/edit/loading.tsx
 * Description : 제품 수정 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 * 2026.03.12  임도헌   Modified  flat 헤더와 현재 제품 수정 폼 필드 밀도에 맞춰 스켈레톤 정리
 * 2026.03.29  임도헌   Modified  현재 ProductForm 섹션 리듬과 삭제 CTA 종료 지점에 맞춰 수정 스켈레톤 재정렬
 * 2026.04.12  임도헌   Moved     파일 경로를 app/products/view/[id]/edit/loading.tsx 에서 app/(app)/products/view/[id]/edit/loading.tsx 로 변경 (라우트 그룹 개편)
*/
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border-subtle bg-background px-4 shadow-sm">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>

      <div className="mx-auto flex w-full max-w-mobile flex-col gap-form-gap px-page-x py-page-y">
        {/* 이미지 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="flex gap-2">
            <Skeleton className="size-24 rounded-xl" />
            <Skeleton className="size-24 rounded-xl" />
          </div>
          <Skeleton className="h-3 w-48 rounded" />
        </div>

        <div className="flex flex-col gap-1 pt-1">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-3 w-52 rounded" />
        </div>

        <div className="grid grid-cols-1 gap-form-gap md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-form-gap md:grid-cols-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>

        <div className="flex flex-col gap-1 pt-1">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-3 w-48 rounded" />
        </div>

        <div className="grid grid-cols-1 gap-form-gap md:grid-cols-3">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-form-gap md:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-dim/40 px-4 py-3">
          <Skeleton className="size-5 shrink-0 rounded-md" />
          <Skeleton className="h-4 w-28 rounded" />
        </div>

        <div className="flex flex-col gap-1 pt-1">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-3 w-48 rounded" />
        </div>

        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-14 w-full rounded-xl border border-border-subtle" />
        </div>

        <div className="pt-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>

        <div className="mt-2 border-t border-border-subtle pt-5">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

