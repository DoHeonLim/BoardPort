/**
 * File Name : app/(app)/admin/loading.tsx
 * Description : 관리자 대시보드 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   관리자 대시보드용 로딩 스켈레톤 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/admin/loading.tsx 에서 app/(app)/admin/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.08.27  임도헌   Modified  상위 관리자 레이아웃과 중복되던 main 랜드마크 제거
 * 2026.08.28  임도헌   Modified  관리자 로딩 컴포넌트 함수 JSDoc 보강
 */

import Skeleton from "@/components/ui/Skeleton";

/**
 * 관리자 화면의 사이드바·헤더·대시보드 로딩 형태를 미리 표시한다.
 *
 * @returns 관리자 대시보드 로딩 스켈레톤
 */
export default function Loading() {
  return (
    <div className="flex min-h-screen w-full bg-background transition-colors">
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border-subtle bg-surface">
        <div className="flex h-16 items-center gap-3 border-b border-border-subtle px-6">
          <Skeleton className="size-8 rounded-xl" />
          <Skeleton className="h-6 w-28 rounded" />
        </div>
        <div className="flex-1 space-y-3 p-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-11 w-full rounded-xl" />
          ))}
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border-subtle bg-surface px-4 md:px-8">
          <div className="flex items-center gap-4">
            <Skeleton className="size-10 rounded-xl md:hidden" />
            <Skeleton className="h-6 w-32 rounded" />
          </div>
          <Skeleton className="size-10 rounded-xl" />
        </header>

        <div className="w-full max-w-[1600px] flex-1 space-y-6 p-4 md:p-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded" />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>

          <Skeleton className="h-[420px] w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
