/**
 * File Name : app/(app)/(tabs)/profile/(product)/my-likes/loading.tsx
 * Description : 나의 찜한 내역 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.06  임도헌   Created   찜한 내역 전용 ProductCard 리스트 스켈레톤 적용
 * 2026.03.12  임도헌   Modified  프로필 찜한 내역 스켈레톤 구분선을 border-border-subtle 톤으로 통일
 * 2026.03.26  임도헌   Modified  프로필 찜 목록 로딩 패턴을 ProductCard 톤에 맞춰 정리
 * 2026.04.09  임도헌   Modified  로컬 페이지 맥락에 맞게 찜 해제 액션 포함 스켈레톤으로 구체화
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/(product)/my-likes/loading.tsx 에서 app/(app)/(tabs)/profile/(product)/my-likes/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.17  임도헌   Modified  실카드 메타 리듬에 맞춰 좋아요/조회수/찜시점 구간의 상단 구분선을 제거하고 간격만 유지
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="px-page-x py-6 flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm"
          >
            <div className="flex gap-4 p-4">
              <Skeleton className="size-24 rounded-xl shrink-0 sm:size-28" />

              <div className="flex flex-1 flex-col justify-between py-1">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16 rounded" />
                      <Skeleton className="h-5 w-40 rounded" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-full" />
                  </div>
                  <Skeleton className="h-7 w-24 rounded-lg" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-12 rounded" />
                    <Skeleton className="h-4 w-14 rounded" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-8 rounded" />
                    <Skeleton className="h-3 w-8 rounded" />
                    <Skeleton className="h-3 w-10 rounded" />
                  </div>
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



