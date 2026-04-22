/**
 * File Name : app/(app)/(tabs)/profile/edit/loading.tsx
 * Description : 프로필 수정 페이지 로딩 스켈레톤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.15  임도헌   Created   ProfileEditForm 구조와 일치하는 스켈레톤 생성
 * 2026.03.17  임도헌   Modified  최근 프로필 폼 패널 톤에 맞춰 border-border-subtle 중심 구조로 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/profile/edit/loading.tsx 에서 app/(app)/(tabs)/profile/edit/loading.tsx 로 변경 (라우트 그룹 개편)
 */

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="layout-container min-h-screen bg-background py-page-y px-page-x">
      {/* 타이틀 */}
      <div className="mb-8 flex justify-center">
        <Skeleton className="h-8 w-32 rounded-lg" />
      </div>

      {/* 아바타 섹션 */}
      <div className="mb-8 flex flex-col items-center">
        <Skeleton className="size-28 rounded-full border-2 border-border-subtle" />
        <Skeleton className="h-4 w-20 mt-3 rounded" />
      </div>

      {/* 폼 필드 */}
      <div className="flex flex-col gap-6">
        {/* 닉네임 */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-20 rounded" />
          <Skeleton className="h-input-md w-full rounded-xl" />
        </div>

        {/* 이메일 */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-16 rounded" />
          <Skeleton className="h-input-md w-full rounded-xl" />
        </div>

        {/* 전화번호 인증 패널 */}
        <div className="mt-2 space-y-3 border-t border-border-subtle pt-4">
          <Skeleton className="h-5 w-24 rounded" />
          <div className="rounded-xl border border-border-subtle bg-surface p-4">
            <div className="flex gap-2">
              <Skeleton className="h-input-md flex-1 rounded-xl" />
              <Skeleton className="h-input-md w-24 rounded-xl" />
            </div>
            <div className="mt-4 space-y-2">
              <Skeleton className="h-3 w-48 rounded" />
              <Skeleton className="h-3 w-40 rounded" />
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="mt-4 flex flex-col gap-3">
          <Skeleton className="h-input-md w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-12 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}


