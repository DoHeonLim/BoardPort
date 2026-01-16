/**
 * File Name : app/streams/add/loading
 * Description : 스트리밍 생성 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 */
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background px-6 py-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-2 mb-6">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-4 w-full max-w-sm rounded" />
        </div>

        {/* Form */}
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />

        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        <Skeleton className="h-12 w-full rounded-xl mt-4" />
      </div>
    </div>
  );
}
