/**
 * File Name : app/posts/add/loading
 * Description : 게시글 작성 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * 2026.01.14  임도헌   Created
 */
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-5">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Category Select */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* Title Input */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* Description Textarea */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
