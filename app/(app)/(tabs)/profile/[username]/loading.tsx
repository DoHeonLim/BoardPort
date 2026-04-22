/**
 * File Name : app/(app)/(tabs)/profile/[username]/loading.tsx
 * Description : 유저 프로필 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.10.07  임도헌   Created   로딩 스켈레톤 추가
 * 2025.11.13  임도헌   Modified  UserProfile 섹션 구조에 맞춰 스켈레톤 정비
 * 2026.01.15  임도헌   Modified  UserProfile 구조 재반영
 * 2026.03.17  임도헌   Modified  방송국 rail 카드 폭과 판매 패널 외곽선을 현재 프로필 톤에 맞춰 정리
 * 2026.03.28  임도헌   Modified  타인 프로필 sticky 액션 헤더와 현재 판매 패널 문법에 맞춰 로딩 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/[username]/loading.tsx 에서 app/(app)/(tabs)/profile/[username]/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background transition-colors pb-24">
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border-subtle bg-background px-4 py-3 shadow-sm sm:border-none">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="size-10 rounded-xl" />
      </div>

      <div className="px-page-x pb-10 pt-4 flex flex-col gap-8">
        {/* 1. 헤더 스켈레톤 (ProfileHeader) */}
        <div className="flex items-start gap-4 sm:gap-5">
          {/* 아바타 */}
          <Skeleton className="size-12 sm:size-20 rounded-full shrink-0" />

          {/* 정보 */}
          <div className="flex-1 space-y-3 py-1 min-w-0">
            {/* 사용자 이름 */}
            <Skeleton className="h-6 sm:h-7 w-32 rounded-lg" />
            {/* 가입일 */}
            <Skeleton className="h-4 w-24 rounded" />

            {/* 평점 */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="size-3.5 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-4 w-12 rounded" />
            </div>

            {/* 팔로우 수치 및 버튼 */}
            <div className="flex flex-wrap gap-3 mt-1 items-center">
              <Skeleton className="h-5 w-16 rounded" />
              <Skeleton className="h-5 w-16 rounded" />
              {/* 팔로우 버튼 */}
              <Skeleton className="h-8 w-20 rounded-lg ml-auto sm:ml-0" />
            </div>
          </div>
        </div>

        {/* 2. 방송국 (레일 레이아웃) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-20 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          {/* 레일 카드 */}
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map((i) => (
              <div key={i} className="w-[216px] shrink-0 space-y-2 sm:w-[232px]">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <Skeleton className="h-3 w-24 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* 3. 후기 및 뱃지 */}
        <div className="flex flex-col gap-8">
          {/* 후기 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          </div>

          {/* 뱃지 (직접 목록) */}
          <div className="space-y-3">
            {/* 제목만 표시 */}
            <Skeleton className="h-5 w-24 rounded" />

            {/* 뱃지 목록 (가로 스크롤) */}
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="size-[84px] rounded-xl shrink-0" />
              ))}
            </div>
          </div>
        </div>

        {/* 4. 판매 목록 탭 */}
        <div className="space-y-4">
          <Skeleton className="h-5 w-20 rounded" />
          <div className="panel bg-surface p-4">
            {/* 탭 */}
            <div className="flex gap-1 mb-4 bg-surface-dim rounded-lg p-1">
              <Skeleton className="h-11 flex-1 rounded-lg" />
              <Skeleton className="h-11 flex-1 rounded-lg" />
            </div>

            {/* 보기 전환 */}
            <div className="flex justify-end gap-1 mb-3">
              <Skeleton className="size-11 rounded-lg" />
              <Skeleton className="size-11 rounded-lg" />
            </div>

            {/* 목록 아이템 */}
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex gap-4 rounded-xl border border-border-subtle p-3"
                >
                  <Skeleton className="size-24 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2 py-1">
                    <Skeleton className="h-5 w-3/4 rounded" />
                    <Skeleton className="h-4 w-1/3 rounded" />
                    <div className="flex gap-2 mt-auto pt-2">
                      <Skeleton className="h-4 w-12 rounded" />
                      <Skeleton className="h-4 w-12 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

