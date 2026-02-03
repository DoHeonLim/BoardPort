/**
 * File Name : app/posts/[id]/edit/loading.tsx
 * Description : 게시글 수정 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 */
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-5">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Images Loader */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="aspect-square rounded-xl" />
          </div>
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
