/**
 * File Name : app/(tabs)/profile/edit/loading
 * Description : 프로필 수정 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.15  임도헌   Created   ProfileEditForm 구조와 일치하는 스켈레톤 생성
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="layout-container py-page-y px-page-x bg-background min-h-screen">
      {/* Title */}
      <div className="flex justify-center mb-8">
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* Avatar Section */}
      <div className="flex flex-col items-center mb-8">
        <Skeleton className="size-28 rounded-full border-2 border-border" />
        <Skeleton className="h-4 w-20 mt-3 rounded" />
      </div>

      {/* Form Fields */}
      <div className="flex flex-col gap-6">
        {/* Username */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-input-md w-full rounded-xl" />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-input-md w-full rounded-xl" />
        </div>

        {/* Phone Section (Panel) */}
        <div className="pt-4 border-t border-border mt-2 space-y-3">
          <Skeleton className="h-5 w-24 rounded" />
          <div className="p-4 rounded-xl border border-border bg-surface shadow-sm">
            <div className="flex gap-2">
              <Skeleton className="h-input-md flex-1 rounded-xl" />
              <Skeleton className="h-input-md w-24 rounded-xl" />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mt-4">
          <Skeleton className="h-input-md w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
