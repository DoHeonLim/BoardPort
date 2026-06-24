/**
 * File Name : app/(app)/admin/users/loading.tsx
 * Description : 관리자 유저 관리 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   유저 인사이트와 목록 구조에 맞는 로딩 스켈레톤 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/admin/users/loading.tsx 에서 app/(app)/admin/users/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32 rounded-lg" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>

      <Skeleton className="h-[420px] w-full rounded-2xl" />
    </div>
  );
}

