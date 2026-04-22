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
 * 2026.03.06  임도헌   Modified  StreamCard의 최신 정보 밀도와 동일한 패딩/메타 간격으로 정리
 * 2026.03.19  임도헌   Modified  실제 StreamCard와 동일하게 border-border-subtle 기준으로 스켈레톤 외곽선을 통일
 */

import Skeleton from "@/components/ui/Skeleton";

/**
 * 스트리밍 카드 로딩 상태 UI
 * - 썸네일(16:9), 제목, 아바타, 메타 정보 영역의 스켈레톤을 표시
 */
export default function StreamCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
      {/* 썸네일 (16:9) */}
      <div className="relative aspect-video w-full border-b border-border-subtle bg-surface-dim">
        <Skeleton className="w-full h-full" />
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-1 flex-col justify-between gap-1.5 p-2.5 sm:gap-2 sm:p-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" /> {/* 제목 */}
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" /> {/* 아바타 */}
            <Skeleton className="h-3 w-20 rounded" /> {/* 사용자 이름 */}
          </div>
        </div>

        <div className="flex items-center gap-1.5 border-t border-border-subtle pt-1.5">
          <Skeleton className="h-3 w-16 rounded" /> {/* 카테고리 */}
          <Skeleton className="h-3 w-12 rounded" /> {/* 시간 */}
        </div>
      </div>
    </div>
  );
}
