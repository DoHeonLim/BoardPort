/**
 * File Name : app/(app)/(tabs)/posts/loading.tsx
 * Description : 항해일지 로딩 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.01  임도헌   Created
 * 2024.11.01  임도헌   Modified  게시글 로딩 페이지 추가
 * 2024.12.18  임도헌   Modified  항해일지 로딩 페이지 추가
 * 2024.12.18  임도헌   Modified  카테고리 탭 스켈레톤 추가
 * 2025.06.26  임도헌   Created   상단 필터 고정 + 스켈레톤 UI 적용
 * 2026.01.13  임도헌   Modified  [UI] 실제 페이지 레이아웃과 싱크 맞춤
 * 2026.03.06  임도헌   Modified  실제 게시글 헤더/카드 밀도와 동일한 스켈레톤 구조로 정리
 * 2026.03.11  임도헌   Modified  신규 2단 게시글 헤더 구조와 디자인 토큰(border-subtle)에 맞춘 스켈레톤으로 재정렬
 * 2026.03.12  임도헌   Modified  게시글 로딩 뷰 토글 외곽선을 border-border-subtle 기준으로 통일
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/posts/loading.tsx 에서 app/(app)/(tabs)/posts/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.20  임도헌   Modified  앱 셸(sm) 기준과 헤더 스켈레톤 분기 기준을 일치시켜 640~767px 구간 mismatch 정리
 * 2026.06.01  임도헌   Modified  모바일 게시글 목록 헤더와 뷰 토글 압축 밀도에 맞춘 스켈레톤 조정
 */
import PostListSkeleton from "@/features/post/components/PostListSkeleton";
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="sm:hidden">
        <header className="border-b border-border-subtle bg-background px-3 pt-1.5 pb-1.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="size-10 rounded-xl" />
          </div>
          <div className="mt-1.5 rounded-xl border border-border-subtle bg-background p-1.5">
            <div className="flex gap-1.5 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-20 shrink-0 rounded-full" />
              ))}
            </div>
          </div>
        </header>
      </div>

      <header className="sticky top-0 z-30 hidden border-b border-border-subtle bg-background shadow-sm transition-colors sm:block">
        <div className="mx-auto max-w-5xl px-3 py-2 md:px-5 md:py-3 lg:px-6">
          <div className="flex items-center gap-2 md:gap-3">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 flex-1 rounded-xl sm:h-11 sm:rounded-2xl" />
            <Skeleton className="size-11 rounded-full" />
          </div>
          <div className="mt-2 rounded-xl border border-border-subtle bg-background p-2">
            <div className="flex gap-2 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton
                  key={i}
                  className="h-8 w-20 rounded-full shrink-0 sm:h-9"
                />
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* List Skeleton */}
      <div className="px-page-x py-6">
        <div className="flex justify-end mb-4">
          <div className="flex rounded-2xl border border-border-subtle bg-surface-dim/80 p-1 shadow-sm">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="size-10 rounded-xl" />
          </div>
        </div>
        <PostListSkeleton viewMode="list" />
      </div>
    </div>
  );
}
