/**
 * File Name : app/(app)/posts/add/loading.tsx
 * Description : 게시글 작성 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.14  임도헌   Created   게시글 작성 로딩 스켈레톤 추가
 * 2026.03.17  임도헌   Modified  현재 PostForm 구조에 맞춰 헤더, 이미지 업로더, 태그, 위치 섹션 스켈레톤 반영
 * 2026.03.29  임도헌   Modified  add layout 공통 헤더 중복을 제거하고 현재 작성 폼 본문 구조 기준으로 재정렬
 * 2026.04.12  임도헌   Moved     파일 경로를 app/posts/add/loading.tsx 에서 app/(app)/posts/add/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.06.01  임도헌   Modified  모바일 게시글 작성 폼 compact 밀도에 맞춰 스켈레톤 높이 정리
 * 2026.09.11  임도헌   Modified  실제 폼의 연결 보드게임과 블록 편집기 순서에 맞춘 로딩 구조 동기화
 */
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-5 py-7 sm:px-page-x sm:py-page-y">
        {/* 카테고리 선택 영역 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <Skeleton className="h-11 w-full rounded-xl sm:h-12" />
        </div>

        {/* 연결 보드게임 검색 영역 */}
        <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-dim/30 p-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-56 max-w-full rounded" />
          </div>
          <Skeleton className="h-11 w-full rounded-xl sm:h-12" />
        </div>

        {/* 제목 입력 영역 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-12 rounded" />
          <Skeleton className="h-11 w-full rounded-xl sm:h-12" />
        </div>

        {/* 본문 블록 편집 영역 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-16 rounded" />
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-11 rounded-lg" />
            ))}
          </div>
          <div className="space-y-3 rounded-2xl border border-border-subtle bg-surface p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Skeleton className="size-7 rounded-lg" />
                <Skeleton className="h-7 w-14 rounded-full" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <div className="flex gap-1">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={index} className="size-7 rounded-lg" />
                ))}
              </div>
            </div>
            <Skeleton className="h-[140px] w-full rounded-xl sm:h-[180px]" />
          </div>
        </div>

        {/* 태그 입력 영역 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24 rounded" />
          <Skeleton className="h-11 w-full rounded-xl sm:h-12" />
        </div>

        {/* 관련 장소 선택 영역 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-12 w-full rounded-xl border border-border-subtle" />
        </div>

        {/* 하단 액션 영역 */}
        <div className="pt-3 sm:pt-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:mt-3 sm:gap-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
