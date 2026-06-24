/**
 * File Name : app/(app)/streams/add/loading.tsx
 * Description : 스트리밍 생성 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 * 2026.03.12  임도헌   Modified  현재 스트림 생성 폼과 flat 헤더 밀도에 맞춰 스켈레톤 정리
 * 2026.03.29  임도헌   Modified  add layout의 공통 헤더를 따르도록 본문-only 스켈레톤으로 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/streams/add/loading.tsx 에서 app/(app)/streams/add/loading.tsx 로 변경 (라우트 그룹 개편)
*/
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="bg-background px-page-x py-6 transition-colors">
      <div className="mx-auto max-w-mobile space-y-6">
        <div className="space-y-2 mb-6">
          <Skeleton className="h-4 w-full max-w-sm rounded" />
          <Skeleton className="h-4 w-full max-w-xs rounded" />
        </div>

        {/* Form */}
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        <Skeleton className="h-12 w-full rounded-xl" />

        <div className="rounded-xl border border-border-subtle bg-surface p-4">
          <Skeleton className="h-4 w-40 rounded" />
          <Skeleton className="mt-3 h-12 w-full rounded-xl" />
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

