/**
 * File Name : app/chats/[id]/loading.tsx
 * Description : 채팅방 상세 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.12  임도헌   Created   [UX] 채팅방 상세 스켈레톤 추가
 * 2026.02.26  임도헌   Modified  백그라운드 색상 변경
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-background">
      {/* Header Skeleton */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border shadow-sm h-14 shrink-0">
        <div className="mx-auto w-full px-2 h-full flex items-center justify-between gap-2">
          {/* Back + User */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-surface-dim animate-pulse" />{" "}
            {/* Back Button Placeholder */}
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>

          {/* Product Info */}
          <div className="flex-1 flex justify-end">
            <div className="flex items-center gap-2 bg-surface-dim/50 rounded-lg p-1 pr-2 border border-transparent">
              <Skeleton className="size-8 rounded" />
              <div className="flex flex-col items-end gap-1">
                <Skeleton className="h-3 w-24 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
            </div>
          </div>

          {/* Menu */}
          <Skeleton className="size-9 rounded-full" />
        </div>
      </header>

      {/* Messages Area Skeleton */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden flex flex-col justify-end pb-20">
        {/* Dummy Bubbles */}
        <div className="flex justify-start">
          <Skeleton className="h-10 w-2/3 rounded-2xl rounded-bl-none" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-12 w-1/2 rounded-2xl rounded-br-none bg-brand/20" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-8 w-1/3 rounded-2xl rounded-bl-none" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-16 w-3/4 rounded-2xl rounded-br-none bg-brand/20" />
        </div>
        <div className="flex justify-start">
          <Skeleton className="h-10 w-1/2 rounded-2xl rounded-bl-none" />
        </div>
      </div>

      {/* Input Bar Skeleton */}
      <div className="shrink-0 z-30 w-full bg-surface border-t border-border px-3 py-2 sm:px-4 flex items-end gap-2">
        <div className="flex-1 h-10 rounded-2xl bg-surface-dim animate-pulse" />
        <div className="size-10 rounded-full bg-surface-dim animate-pulse" />
      </div>
    </div>
  );
}
