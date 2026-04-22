/**
 * File Name : app/(public)/offline/loading.tsx
 * Description : 오프라인 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   오프라인 안내 화면용 상태 스켈레톤 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/offline/loading.tsx 에서 app/(public)/offline/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-10 text-center">
      <div className="mb-8 flex flex-col items-center gap-4">
        <Skeleton className="size-28 rounded-full" />
        <Skeleton className="h-8 w-40 rounded-lg" />
        <Skeleton className="h-4 w-52 rounded" />
      </div>

      <div className="mb-8 w-full max-w-sm rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm">
        <div className="space-y-2">
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-3/4 rounded" />
        </div>
      </div>

      <Skeleton className="h-12 w-40 rounded-xl" />
    </main>
  );
}

