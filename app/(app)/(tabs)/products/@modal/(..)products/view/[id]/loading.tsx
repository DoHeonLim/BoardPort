/**
 * File Name : app/(app)/(tabs)/products/@modal/(..)products/view/[id]/loading.tsx
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
 * 2026.03.12  임도헌   Modified  현재 제품 상세 모달의 flat 톤과 정보 카드 밀도에 맞춰 스켈레톤 정리
 * 2026.03.17  임도헌   Modified  실제 모달 상단 액션바 구조와 맞추어 로딩 스켈레톤도 좌우 액션 분리 기준으로 정리
 * 2026.03.19  임도헌   Modified  실제 제품 모달과 동일하게 헤더 분리선도 border-border-subtle 기준으로 통일
 * 2026.03.29  임도헌   Modified  실제 모달 상세의 거래 장소/태그 섹션까지 반영해 스크롤 구조 정합성 보강
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/products/@modal/(..)products/view/[id]/loading.tsx 에서 app/(app)/(tabs)/products/@modal/(..)products/view/[id]/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.30  임도헌   Modified  모달 상세 실제 상단 액션바 높이에 맞춰 로딩 헤더 밀도 정리
 */

import CloseButton from "@/components/global/CloseButton";
import Skeleton from "@/components/ui/Skeleton";
import { EllipsisVerticalIcon, ShareIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-0 sm:p-4">
      <div
        className={cn(
          "flex flex-col overflow-hidden bg-background shadow-2xl transition-all outline-none",
          // [Mobile] Full Screen, [Desktop] Center Card
          "h-full w-full sm:h-auto sm:max-h-[85vh] sm:max-w-screen-sm sm:rounded-2xl sm:border sm:border-border-subtle"
        )}
      >
        {/* Header (Action Bar) */}
        <div className="flex h-[52px] shrink-0 items-center justify-between gap-2.5 border-b border-border-subtle bg-surface px-3">
          <CloseButton className="pointer-events-none opacity-50" />
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-hidden="true"
              className="appbar-icon-btn pointer-events-none opacity-50"
            >
              <ShareIcon className="size-5" />
            </button>
            <button
              type="button"
              aria-hidden="true"
              className="appbar-icon-btn pointer-events-none opacity-50"
            >
              <EllipsisVerticalIcon className="size-5" />
            </button>
          </div>
        </div>

        {/* Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide pb-20">
          {/* Image */}
          <Skeleton className="aspect-square w-full border-b border-border-subtle sm:aspect-[4/3]" />

          {/* Seller */}
          <div className="flex items-center justify-between border-b border-border-subtle bg-background px-6 py-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="size-9 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-16 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
            </div>
            <Skeleton className="h-3 w-14 rounded" />
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
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border-subtle bg-surface-dim p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2">
                  <Skeleton className="h-3 w-12 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              ))}
            </div>

            {/* Location */}
            <section className="mt-2 border-t border-border-subtle py-2 pt-6">
              <Skeleton className="mb-3 h-4 w-24 rounded" />
              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
                <Skeleton className="aspect-[16/10] w-full rounded-none" />
              </div>
            </section>

            {/* Tags */}
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




