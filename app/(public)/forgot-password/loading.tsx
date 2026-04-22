/**
 * File Name : app/(public)/forgot-password/loading.tsx
 * Description : 비밀번호 찾기 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   비밀번호 재설정 메일 요청 흐름에 맞는 로딩 스켈레톤 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/forgot-password/loading.tsx 에서 app/(public)/forgot-password/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-page-x py-page-y transition-colors">
      <div className="mt-10 mb-8 flex flex-col items-center gap-4">
        <Skeleton className="size-[84px] rounded-2xl" />
        <div className="space-y-2 text-center">
          <Skeleton className="mx-auto h-8 w-36 rounded-lg" />
          <Skeleton className="mx-auto h-4 w-64 rounded" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm space-y-4">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}

