/**
 * File Name : app/(app)/(tabs)/profile/[username]/posts/loading.tsx
 * Description : 사용자 작성 게시글 목록 로딩 화면
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   상단바와 게시글 카드 스켈레톤 추가
 */

import Skeleton from "@/components/ui/Skeleton";
import PostListSkeleton from "@/features/post/components/PostListSkeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="flex h-[52px] items-center gap-3 border-b border-border-subtle px-3">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-5 w-40 rounded" />
      </div>
      <div className="px-page-x py-5 sm:py-6">
        <PostListSkeleton viewMode="list" />
      </div>
    </div>
  );
}
