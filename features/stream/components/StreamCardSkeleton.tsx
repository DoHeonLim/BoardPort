/**
 * File Name : features/stream/components/StreamCardSkeleton.ts
x * Description : 스트리밍 카드 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.13  임도헌   Created   StreamCard 구조에 맞춘 스켈레톤 생성
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

import Skeleton from "@/components/ui/Skeleton";

/**
 * 스트리밍 카드 로딩 상태 UI
 * - 썸네일(16:9), 제목, 아바타, 메타 정보 영역의 스켈레톤을 표시합니다.
 */
export default function StreamCardSkeleton() {
  return (
    <div className="flex flex-col rounded-2xl overflow-hidden border border-border bg-surface shadow-sm h-full">
      {/* Thumbnail (16:9) */}
      <div className="relative aspect-video w-full bg-surface-dim border-b border-border">
        <Skeleton className="w-full h-full" />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col justify-between p-3 gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" /> {/* Title */}
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" /> {/* Avatar */}
            <Skeleton className="h-3 w-20 rounded" /> {/* Username */}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Skeleton className="h-3 w-16 rounded" /> {/* Category */}
          <Skeleton className="h-3 w-12 rounded" /> {/* Time */}
        </div>
      </div>
    </div>
  );
}
