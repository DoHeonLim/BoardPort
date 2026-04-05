/**
 * File Name : app/(tabs)/streams/loading.tsx
 * Description : 스트리밍 탭 로딩
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.21  임도헌   Created
 * 2025.05.21  임도헌   Modified  라이브 스트리밍 로딩 페이지 추가
 * 2026.01.14  임도헌   Modified  탭/검색창/리스트 스켈레톤 적용
 * 2026.03.06  임도헌   Modified  실제 스트림 헤더/카드 밀도와 동일한 스켈레톤 구조로 정리
 * 2026.03.11  임도헌   Modified  신규 2단 스트림 헤더 구조와 디자인 토큰(border-subtle)에 맞춘 스켈레톤으로 재정렬
 * 2026.03.12  임도헌   Modified  스트림 로딩 세그먼트 외곽선을 border-border-subtle 기준으로 통일
 * 2026.03.19  임도헌   Modified  현재 StreamMobileHeader의 낮아진 박스감에 맞춰 스코프/카테고리 스켈레톤 밀도를 한 단계 완화
 * 2026.03.28  임도헌   Modified  라이브/다시보기 최상단 모드 탭이 추가된 3단 헤더 구조에 맞춰 보정
 */

import StreamListSkeleton from "@/features/stream/components/StreamListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="md:hidden">
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
          <div className="mt-1 flex items-center gap-2">
            <div className="flex rounded-xl border border-border-subtle bg-background p-0.5">
              <Skeleton className="h-8 w-14 rounded-lg" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
            <div className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface/40 p-1.5">
              <div className="flex gap-2 overflow-hidden">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
                ))}
              </div>
            </div>
          </div>
        </header>
      </div>

      <header className="sticky top-0 z-30 hidden border-b border-border-subtle bg-background shadow-sm md:block">
        <div className="mx-auto max-w-5xl px-3 py-2 md:px-5 md:py-2.5 lg:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="flex rounded-xl border border-border-subtle bg-background p-0.5">
              <Skeleton className="h-9 w-20 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 md:gap-3">
            <Skeleton className="h-10 flex-1 rounded-xl sm:h-11 sm:rounded-2xl" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          <div className="mt-1.5 flex items-center gap-2 md:gap-3">
            <div className="flex rounded-xl border border-border-subtle bg-background p-0.5">
              <Skeleton className="h-9 w-16 rounded-lg" />
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
            <div className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-surface/40 p-1.5">
              <div className="flex gap-2 overflow-hidden">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-8 w-20 rounded-full shrink-0 sm:h-9"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <StreamListSkeleton />
      </div>
    </div>
  );
}
