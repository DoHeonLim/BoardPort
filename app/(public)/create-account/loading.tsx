/**
 * File Name : app/(public)/create-account/loading.tsx
 * Description : 회원가입 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 * 2026.03.12  임도헌   Modified  현재 회원가입 히어로/폼 밀도에 맞춰 스켈레톤 구조 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/create-account/loading.tsx 에서 app/(public)/create-account/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
      <div className="mt-10 mb-8 flex flex-col items-center gap-4">
        <Skeleton className="size-14 rounded-2xl" />
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-8 w-32 rounded" />
          <Skeleton className="h-4 w-56 rounded" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-sm space-y-5">
        <Skeleton className="h-16 w-full rounded-2xl" />
        {/* Inputs */}
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />

        {/* Button */}
        <Skeleton className="mt-6 h-12 w-full rounded-xl" />

        {/* Link */}
        <div className="flex justify-center mt-4">
          <Skeleton className="h-4 w-40 rounded" />
        </div>
      </div>
    </div>
  );
}

