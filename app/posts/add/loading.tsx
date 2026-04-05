/**
 * File Name : app/posts/add/loading.tsx
 * Description : 게시글 작성 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created   게시글 작성 로딩 스켈레톤 추가
 * 2026.03.17  임도헌   Modified  현재 PostForm 구조에 맞춰 헤더, 이미지 업로더, 태그, 위치 섹션 스켈레톤 반영
 * 2026.03.29  임도헌   Modified  add layout 공통 헤더 중복을 제거하고 현재 작성 폼 본문 구조 기준으로 재정렬
 */
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="mx-auto max-w-3xl space-y-6 px-page-x py-page-y">
        {/* 이미지 업로더 영역 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-32 w-full rounded-xl border border-border-subtle" />
          <Skeleton className="h-3 w-36 rounded" />
        </div>

        {/* 카테고리 선택 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* 제목 입력 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* 내용 입력 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>

        {/* 태그 입력 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-14 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        {/* 위치 태그 섹션 */}
        <div className="space-y-2 pt-2">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-12 w-full rounded-xl border border-border-subtle" />
        </div>

        {/* 액션 버튼 */}
        <div className="pt-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
