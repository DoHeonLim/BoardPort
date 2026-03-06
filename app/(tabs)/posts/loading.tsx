/**
 * File Name : app/(tabs)/posts/loading.tsx
 * Description : 항해일지 로딩 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.01  임도헌   Created
 * 2024.11.01  임도헌   Modified  동네생활 로딩 페이지 추가
 * 2024.12.18  임도헌   Modified  항해일지 로딩 페이지 추가
 * 2024.12.18  임도헌   Modified  카테고리 탭 스켈레톤 추가
 * 2025.06.26  임도헌   Created   상단 필터 고정 + 스켈레톤 UI 적용
 * 2026.01.13  임도헌   Modified  [UI] 실제 페이지 레이아웃과 싱크 맞춤
 * 2026.03.06  임도헌   Modified  실제 게시글 헤더/카드 밀도와 동일한 스켈레톤 구조로 정리
 */
import PostListSkeleton from "@/features/post/components/PostListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border shadow-sm transition-colors">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 h-[50px]">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="size-11 rounded-full" />
        </div>
        <div className="border-b border-border/50 px-4 py-3">
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
        <div className="px-4 py-2">
          <div className="flex gap-2 overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-full shrink-0" />
            ))}
          </div>
        </div>
      </header>

      {/* List Skeleton */}
      <div className="px-page-x py-6">
        <div className="flex justify-end mb-4">
          <div className="flex rounded-xl border border-border bg-surface-dim/80 p-1 shadow-sm">
            <Skeleton className="size-11 rounded-lg" />
            <Skeleton className="size-11 rounded-lg" />
          </div>
        </div>
        <PostListSkeleton viewMode="list" />
      </div>
    </div>
  );
}
