/**
 * File Name : app/(app)/posts/[id]/edit/loading.tsx
 * Description : 게시글 수정 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created
 * 2026.03.12  임도헌   Modified  flat 헤더와 현재 게시글 수정 폼 필드 구조에 맞춰 스켈레톤 정리
 * 2026.03.29  임도헌   Modified  공통 layout 헤더 중복을 제거하고 현재 PostForm 섹션 구조에 맞춰 스켈레톤 재정렬
 * 2026.04.12  임도헌   Moved     파일 경로를 app/posts/[id]/edit/loading.tsx 에서 app/(app)/posts/[id]/edit/loading.tsx 로 변경 (라우트 그룹 개편)
*/
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="mx-auto max-w-3xl space-y-6 px-page-x py-page-y">
        {/* 이미지 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-32 w-full rounded-xl border border-border-subtle" />
          <Skeleton className="h-3 w-32 rounded" />
        </div>

        {/* 카테고리 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* 제목 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>

        {/* 설명 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>

        {/* 태그 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-14 rounded" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>

        {/* 위치 */}
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

        {/* 삭제 CTA */}
        <div className="flex items-center justify-center pt-2">
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

