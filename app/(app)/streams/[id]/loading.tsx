/**
 * File Name : app/(app)/streams/[id]/loading.tsx
 * Description : 방송 상세 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created   방송 상세 로딩 페이지 추가
 * 2026.03.12  임도헌   Modified  flat 헤더 톤과 현재 방송 상세 레이아웃 밀도에 맞춰 스켈레톤 정리
 * 2026.03.29  임도헌   Modified  StreamTopbar의 뒤로가기/가시성 칩/액션 버튼 구조에 맞춰 상단 스켈레톤 재정렬
 * 2026.04.12  임도헌   Moved     파일 경로를 app/streams/[id]/loading.tsx 에서 app/(app)/streams/[id]/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.28  임도헌   Modified  모바일 스트림 상세 full-bleed 플레이어/채팅 레이아웃에 맞춰 스켈레톤 재정렬
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background lg:h-auto lg:min-h-screen lg:overflow-visible">
      <div className="hidden h-14 w-full items-center justify-between border-b border-border-subtle bg-surface px-6 shadow-sm lg:flex">
        <div className="flex items-center gap-2">
          <Skeleton className="size-11 rounded-xl" />
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col overflow-hidden lg:grid lg:max-w-[1624px] lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-2.5 lg:px-4 lg:pt-2.5 lg:overflow-visible xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 shrink-0 lg:w-full lg:space-y-4">
          <Skeleton className="aspect-video w-full rounded-none bg-surface-dim lg:rounded-2xl" />

          <div className="hidden space-y-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm lg:block">
            <Skeleton className="h-6 w-3/4 rounded" />
            <div className="flex items-center gap-3 rounded-xl bg-surface-dim/40 px-3 py-2.5">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-20 rounded" />
              </div>
            </div>
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/5 rounded" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border-subtle bg-background lg:sticky lg:top-3 lg:mt-0 lg:h-[90dvh] lg:max-h-[90dvh] lg:w-[320px] lg:flex-none lg:rounded-2xl lg:border lg:bg-surface lg:shadow-lg xl:w-[360px]">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-border-subtle px-3 lg:h-12 lg:px-4">
            <Skeleton className="h-4 w-10 rounded" />
            <Skeleton className="size-8 rounded-lg" />
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-hidden p-3 lg:p-4">
            <div className="flex justify-start">
              <Skeleton className="h-9 w-28 rounded-2xl rounded-bl-none" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-24 rounded-2xl rounded-br-none bg-brand/20 dark:bg-brand-light/20" />
            </div>
            <div className="flex justify-start">
              <Skeleton className="h-9 w-36 rounded-2xl rounded-bl-none" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-32 rounded-2xl rounded-br-none bg-brand/20 dark:bg-brand-light/20" />
            </div>
          </div>

          <div className="shrink-0 border-t border-border-subtle bg-surface px-2.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] lg:px-3 lg:pt-3 lg:pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-2">
              <Skeleton className="h-11 flex-1 rounded-full lg:h-12" />
              <Skeleton className="size-10 rounded-full lg:size-11" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

