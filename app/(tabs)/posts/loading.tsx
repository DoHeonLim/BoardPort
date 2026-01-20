/**
 * File Name : app/(tabs)/posts/loading
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
 */
import PostListSkeleton from "@/features/post/components/PostListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      {/* Header Skeleton */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 h-[106px] flex flex-col gap-3">
        <div className="flex gap-2 overflow-hidden">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
          ))}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>

      {/* List Skeleton */}
      <div className="px-page-x py-6">
        <PostListSkeleton viewMode="list" />
      </div>
    </div>
  );
}
