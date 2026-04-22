/**
 * File Name : features/stream/components/StreamsPageSkeleton.tsx
 * Description : 스트림 탭 페이지 공용 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.20  임도헌   Created   route loading.tsx와 페이지 구조가 동일한 헤더/breakpoint 문법을 공유하도록 스트림 탭 스켈레톤을 공용 컴포넌트로 분리
 */

import Skeleton from "@/components/ui/Skeleton";
import StreamListSkeleton from "@/features/stream/components/StreamListSkeleton";

/**
 * 스트림 탭 페이지 전체 스켈레톤
 *
 * - sm 미만: 모바일 헤더 스켈레톤
 * - sm 이상: 데스크톱 헤더 스켈레톤
 * - 본문: 실제 페이지와 동일한 padding rhythm
 */
export default function StreamsPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <div className="sm:hidden">
        <header className="border-b border-border-subtle bg-background px-3 pt-1.5 pb-1.5 shadow-sm">
          <div className="flex items-center gap-2 py-1">
            <div className="flex w-full rounded-xl border border-border-subtle bg-background p-0.5">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 flex-1 rounded-lg" />
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 py-1">
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <div className="flex flex-1 rounded-xl border border-border-subtle bg-background p-0.5">
              <Skeleton className="h-8 flex-1 rounded-lg" />
              <Skeleton className="h-8 flex-1 rounded-lg" />
            </div>
            <Skeleton className="h-[38px] w-20 rounded-xl" />
            <Skeleton className="h-[38px] w-[84px] rounded-xl" />
          </div>
        </header>
      </div>

      <header className="sticky top-0 z-30 hidden border-b border-border-subtle bg-background sm:block">
        <div className="px-3 py-2 md:px-5 md:py-2.5 lg:px-6">
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border-subtle bg-background p-0.5">
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-xl sm:h-11 sm:rounded-2xl" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex rounded-xl border border-border-subtle bg-background p-0.5">
              <Skeleton className="h-9 w-16 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
            <Skeleton className="h-10 w-24 rounded-xl" />
            <div className="min-w-0 flex-1 overflow-hidden rounded-xl border border-border-subtle bg-background p-1.5">
              <div className="flex gap-2 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-8 w-20 shrink-0 rounded-full sm:h-9"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-page-x py-5 md:py-6">
        <StreamListSkeleton />
      </div>
    </div>
  );
}
