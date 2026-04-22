/**
 * File Name : app/(app)/posts/[id]/loading.tsx
 * Description : 게시글 상세 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 * 2026.02.26  임도헌   Modified  백그라운드 색상 변경
 * 2026.03.12  임도헌   Modified  flat 헤더 톤과 현재 상세 본문 밀도에 맞춰 스켈레톤 구조 정리
 * 2026.03.29  임도헌   Modified  최신 상세의 상단 액션 수와 태그/지도/메타 흐름에 맞춰 2차 보정
 * 2026.04.12  임도헌   Moved     파일 경로를 app/posts/[id]/loading.tsx 에서 app/(app)/posts/[id]/loading.tsx 로 변경 (라우트 그룹 개편)
*/
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="relative min-h-screen bg-background pb-20 transition-colors">
      {/* 상단바 스켈레톤 */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border-subtle bg-background px-3 shadow-sm sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Skeleton className="size-10 rounded-xl" /> {/* 뒤로가기 */}
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Skeleton className="hidden h-7 w-16 rounded-full sm:block" />
          <Skeleton className="size-10 rounded-full" />
          <Skeleton className="size-10 rounded-full" />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-mobile flex-col gap-8 px-page-x py-6">
        <div className="sm:hidden -mb-4">
          <Skeleton className="h-7 w-20 rounded-full" />
        </div>

        {/* 제목 */}
        <Skeleton className="h-9 w-3/4 rounded-xl" />

        {/* 설명 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <Skeleton className="h-4 w-2/3 rounded" />
        </div>

        {/* 태그 */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-14 rounded-full" />
        </div>

        {/* 캐러셀 */}
        <div className="border-t border-border-subtle pt-4">
          <Skeleton className="aspect-video w-full rounded-2xl border border-border-subtle" />
        </div>

        {/* 지도 */}
        <div className="border-t border-border-subtle pt-4">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="size-4 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
            <div className="border-b border-border-subtle px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Skeleton className="size-9 rounded-full shrink-0" />
                  <div className="min-w-0 space-y-2">
                    <Skeleton className="h-4 w-28 rounded" />
                    <Skeleton className="h-3 w-36 rounded" />
                  </div>
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-48 w-full sm:h-56" />
          </div>
        </div>

        {/* 메타 정보 */}
        <div className="border-t border-border-subtle pt-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded" />
          </div>
        </div>

        {/* 댓글 */}
        <div className="border-t border-border-subtle pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-6 w-24 rounded" />
          </div>
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-full rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

