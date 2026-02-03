/**
 * File Name : app/(auth)/login/loading.tsx
 * Description : 로그인 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen px-6 py-10 bg-background">
      {/* Header Skeleton */}
      <div className="flex flex-col items-center gap-4 mt-10 mb-8">
        <Skeleton className="size-14 rounded-2xl" /> {/* Icon */}
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-8 w-32 rounded" />
          <Skeleton className="h-4 w-48 rounded" />
        </div>
      </div>

      {/* Form Skeleton */}
      <div className="w-full max-w-sm mx-auto space-y-5">
        <Skeleton className="h-12 w-full rounded-xl" /> {/* Email */}
        <Skeleton className="h-12 w-full rounded-xl" /> {/* Password */}
        <Skeleton className="h-12 w-full rounded-xl mt-6" /> {/* Submit */}
        <div className="flex justify-center mt-4">
          <Skeleton className="h-4 w-32 rounded" />
        </div>
        <div className="pt-4 border-t border-border mt-4">
          <Skeleton className="h-12 w-full rounded-xl" /> {/* Social */}
        </div>
      </div>
    </div>
  );
}
