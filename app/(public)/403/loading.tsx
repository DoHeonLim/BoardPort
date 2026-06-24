/**
 * File Name : app/(public)/403/loading.tsx
 * Description : 접근 권한 거부 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   접근 권한 거부 화면용 상태 스켈레톤 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/403/loading.tsx 에서 app/(public)/403/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-page-x py-10 sm:py-16">
      <div className="w-full max-w-md rounded-3xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-4">
          <Skeleton className="size-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 rounded-lg" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-5/6 rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>
        <div className="mt-6 flex gap-3">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 flex-1 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

