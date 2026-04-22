/**
 * File Name : app/(public)/login/loading.tsx
 * Description : 로그인 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 * 2026.03.12  임도헌   Modified  현재 로그인 히어로/폼 밀도에 맞춰 스켈레톤 구조 정리
 * 2026.03.17  임도헌   Modified  이메일 우선 로그인 흐름과 소셜 하단 배치 기준으로 로딩 순서 재정렬
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(auth)/login/loading.tsx 에서 app/(public)/login/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10">
      {/* Header Skeleton */}
      <div className="mt-10 mb-8 flex flex-col items-center gap-4">
        <Skeleton className="size-14 rounded-2xl" /> {/* Icon */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-8 w-32 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
      </div>

      {/* Form Skeleton */}
      <div className="mx-auto w-full max-w-sm space-y-5">
        <div className="space-y-5">
          <Skeleton className="h-12 w-full rounded-xl" /> {/* Email */}
          <Skeleton className="h-12 w-full rounded-xl" /> {/* Password */}
          <div className="flex justify-end">
            <Skeleton className="h-4 w-28 rounded" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" /> {/* Submit */}
        </div>

        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-subtle" />
          </div>
          <div className="relative flex justify-center">
            <Skeleton className="h-4 w-20 rounded bg-background" />
          </div>
        </div>

        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        <div className="flex justify-center pt-1">
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
    </div>
  );
}

