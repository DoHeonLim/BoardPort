/**
 * File Name : features/chat/components/ChatListSkeleton.tsx
 * Description : 채팅 목록 페이지 공용 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.20  임도헌   Created   route loading.tsx와 page Suspense fallback이 동일한 모바일 채팅 목록 스켈레톤을 재사용하도록 공용 컴포넌트로 분리
 */

import Skeleton from "@/components/ui/Skeleton";

/**
 * 채팅 목록 페이지 공용 스켈레톤
 *
 * - 상단 flat 헤더
 * - 검색바
 * - 채팅방 카드 목록
 */
export default function ChatListSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-background pb-24">
      <header className="sticky top-0 z-30 h-16 border-b border-border-subtle bg-background shadow-sm transition-colors">
        <div className="mx-auto flex h-full max-w-mobile items-center justify-between gap-3 px-page-x">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-10 rounded-md" />
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>
          <Skeleton className="size-10 rounded-xl" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-mobile flex-1 flex-col gap-3 px-page-x py-6">
        <div className="mb-1">
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>

        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm"
          >
            <Skeleton className="size-12 shrink-0 rounded-xl sm:size-14" />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
                <Skeleton className="h-3 w-10 rounded" />
              </div>
              <Skeleton className="h-4 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
