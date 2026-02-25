/**
 * File Name : features/stream/components/StreamListSkeleton.tsx
 * Description : 스트리밍 목록 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.13  임도헌   Created   Grid 레이아웃 스켈레톤
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

import StreamCardSkeleton from "@/features/stream/components/StreamCardSkeleton";

/**
 * 스트리밍 목록 로딩 시 보여줄 스켈레톤 UI
 */
export default function StreamListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <StreamCardSkeleton key={i} />
      ))}
    </div>
  );
}
