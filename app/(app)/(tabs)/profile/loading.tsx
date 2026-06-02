/**
 * File Name : app/(app)/(tabs)/profile/loading.tsx
 * Description : 내 프로필 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status     Description
 * 2025.10.07  임도헌   Created    로딩 스켈레톤 추가
 * 2025.10.29  임도헌   Modified   MyProfile 최신 레이아웃과 일치하도록 전면 수정(그라디언트/액션버튼/방송국/뱃지/카드 구성)
 * 2025.11.13  임도헌   Modified   MyProfile 섹션 구조에 맞춰 스켈레톤 정비
 * 2026.01.15  임도헌   Modified   MyProfile 구조 재반영
 * 2026.02.26  임도헌   Modified   헤더에 스켈레톤 하나 추가
 * 2026.03.12  임도헌   Modified   flat 액션 헤더와 현재 프로필 카드 밀도에 맞춰 스켈레톤 구조 정리
 * 2026.03.17  임도헌   Modified   축소된 방송국 StreamCard 폭에 맞춰 rail 스켈레톤 너비 조정
 * 2026.03.28  임도헌   Modified   내 동네 설정 섹션을 포함해 현재 내 프로필 IA와 동일한 순서로 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/loading.tsx 에서 app/(app)/(tabs)/profile/loading.tsx 로 변경 (라우트 그룹 개편)
 * 2026.05.30  임도헌   Modified   내 프로필 실제 액션바 높이에 맞춰 로딩 헤더 밀도 정리
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background pb-24 transition-colors">
      {/* 상단 액션 자리 표시자 */}
      <div className="sticky top-0 z-30 flex h-[52px] items-center justify-end gap-2 border-b border-border-subtle bg-background px-page-x shadow-sm">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="size-10 rounded-xl" />
      </div>

      <div className="flex flex-col gap-8 px-page-x pt-6 pb-10">
        {/* 1. 헤더 스켈레톤 */}
        <div className="flex items-start gap-4 sm:gap-5">
          {/* 아바타 */}
          <Skeleton className="size-12 sm:size-20 rounded-full shrink-0" />

          {/* 정보 */}
          <div className="flex-1 space-y-3 py-1 min-w-0">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 sm:h-7 w-32 rounded-lg" /> {/* 이름 */}
            </div>
            <Skeleton className="h-4 w-24 rounded" /> {/* 날짜 */}
            {/* 평점 */}
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="size-4 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-4 w-12 rounded" />
            </div>
            {/* 팔로우 수치 */}
            <div className="flex gap-3 mt-1">
              <Skeleton className="h-5 w-20 rounded" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
          </div>
        </div>

        {/* 2. 알림 설정 */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
          <div className="h-16 w-full rounded-xl border border-border-subtle bg-surface" />
        </div>

        {/* 3. 내 동네 */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-24 rounded" />
          <div className="h-14 w-full rounded-xl border border-border-subtle bg-surface" />
        </div>

        {/* 4. 거래 정보 (그리드) */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-24 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-24 w-full rounded-xl border border-border-subtle bg-surface" />
            <Skeleton className="h-24 w-full rounded-xl border border-border-subtle bg-surface" />
            <Skeleton className="col-span-2 h-24 w-full rounded-xl border border-border-subtle bg-surface" />
          </div>
        </div>

        {/* 5. 방송국 (레일) */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Skeleton className="h-5 w-24 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map((i) => (
              <div key={i} className="w-[216px] shrink-0 space-y-2 sm:w-[232px]">
                <Skeleton className="aspect-video w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4 rounded" />
                <div className="flex items-center gap-2">
                  <Skeleton className="size-5 rounded-full" />
                  <Skeleton className="h-3 w-16 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 6. 후기 및 뱃지 */}
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-32 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-5 w-28 rounded" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
            <div className="flex gap-3 overflow-hidden">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="size-[84px] rounded-xl shrink-0" />
              ))}
            </div>
          </div>
        </div>

        {/* 로그아웃 버튼 */}
        <div className="border-t border-border-subtle pt-6">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}



