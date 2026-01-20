/**
 * File Name : features/stream/components/StreamListSkeleton.tsx
 * Description : 스트리밍 목록 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.13  임도헌   Created   Grid 레이아웃 스켈레톤
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

import StreamCardSkeleton from "@/features/stream/components/StreamCardSkeleton";

export default function StreamListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <StreamCardSkeleton key={i} />
      ))}
    </div>
  );
}
