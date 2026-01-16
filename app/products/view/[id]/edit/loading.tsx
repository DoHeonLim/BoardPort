/**
 * File Name : app/products/view/[id]/edit/loading
 * Description : 제품 수정 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 */
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <Skeleton className="h-8 w-48 mb-6 rounded" />

      <div className="space-y-6">
        {/* Images */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="flex gap-2">
            <Skeleton className="size-24 rounded-xl" />
            <Skeleton className="size-24 rounded-xl" />
          </div>
        </div>

        {/* Inputs */}
        <Skeleton className="h-12 w-full rounded-xl" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        <Skeleton className="h-32 w-full rounded-xl" />

        <div className="pt-4">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
