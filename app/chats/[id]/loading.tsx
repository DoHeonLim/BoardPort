/**
 * File Name : app/chats/[id]/loading.tsx
 * Description : 채팅방 상세 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.12  임도헌   Created   [UX] 채팅방 상세 스켈레톤 추가
 * 2026.02.26  임도헌   Modified  백그라운드 색상 변경
 * 2026.03.12  임도헌   Modified  flat 헤더와 실제 채팅 상세의 최신 메시지 배치 흐름에 맞춰 스켈레톤 정리
 * 2026.03.28  임도헌   Modified  실제 채팅 배경 일러스트와 헤더/입력바 밀도에 맞춰 로딩 문법 재정렬
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="relative isolate flex h-[100dvh] flex-col overflow-hidden bg-[url('/images/light-chat-bg.png')] bg-cover bg-center dark:bg-[url('/images/dark-chat-bg.png')]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-background/8 dark:bg-background/20"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background/28 via-background/10 to-transparent dark:from-background/45 dark:via-background/15"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-background/35 via-background/10 to-transparent dark:from-background/55 dark:via-background/15"
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col">
        <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-border-subtle bg-background shadow-sm">
          <div className="mx-auto flex h-full w-full items-center justify-between gap-2 px-2">
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <Skeleton className="size-10 rounded-xl" />
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 rounded-2xl border border-border-subtle bg-surface-dim/80 px-2.5 py-1.5 shadow-sm">
                <Skeleton className="hidden size-8 rounded-md xs:block" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Skeleton className="size-10 rounded-full" />
              <Skeleton className="size-10 rounded-full" />
            </div>
          </div>
        </header>

        <div className="flex flex-1 flex-col justify-end overflow-hidden px-4 pb-24 pt-4 sm:px-5">
          <div className="space-y-4">
            <div className="flex items-end gap-2">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-10 w-40 rounded-2xl rounded-bl-none" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-11 w-28 rounded-2xl rounded-br-none bg-brand/20 dark:bg-brand-light/20" />
            </div>
            <div className="flex items-end gap-2">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-2xl rounded-bl-none" />
            </div>
            <div className="flex justify-center">
              <Skeleton className="h-9 w-56 rounded-full bg-surface/80" />
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-16 w-44 rounded-2xl rounded-br-none bg-brand/20 dark:bg-brand-light/20" />
            </div>
            <div className="flex items-end gap-2">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-2xl rounded-bl-none" />
            </div>
          </div>
        </div>

        <div className="z-30 px-3 pb-2 pt-1 sm:px-4 sm:pb-3">
          <div className="flex items-end gap-2 rounded-[28px] border border-border-subtle bg-background/95 px-3 py-2 shadow-[0_-8px_20px_rgba(15,23,42,0.06)] backdrop-blur">
            <Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-12 flex-1 rounded-2xl" />
            <Skeleton className="size-10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
