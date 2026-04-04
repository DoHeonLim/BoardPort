/**
 * File Name : app/(tabs)/chat/loading.tsx
 * Description : 채팅 목록 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.12  임도헌   Created   [UX] 채팅 목록 스켈레톤 추가
 * 2026.03.12  임도헌   Modified  flat 헤더와 검색바가 반영된 현재 채팅 목록 구조에 맞춰 스켈레톤 정리
 * 2026.03.28  임도헌   Modified  헤더/검색바 배치를 실채팅 목록과 동일한 구조로 재정렬
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-mobile flex-col gap-3 bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-background px-page-x py-3 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-10 rounded-md" />
            <Skeleton className="h-6 w-8 rounded-full" />
          </div>
          <Skeleton className="size-10 rounded-xl" />
        </div>
      </header>

      <div className="px-page-x py-4">
        <div className="mb-4">
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <div className="flex flex-col gap-3">
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
    </div>
  );
}
