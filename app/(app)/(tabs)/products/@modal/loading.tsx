/**
 * File Name : app/(app)/(tabs)/products/@modal/loading.tsx
 * Description : 제품 모달 공통 로딩 셸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.22  임도헌   Created
 * 2024.10.22  임도헌   Modified  loading 추가
 * 2025.06.08  임도헌   Created   모달 로딩 시 기본 백드롭 적용
 * 2026.03.17  임도헌   Modified  단순 스피너를 현재 제품 모달 톤과 맞는 셸 스켈레톤 구조로 교체
 * 2026.04.12  임도헌   Moved     파일 경로를 app/(tabs)/products/@modal/loading.tsx 에서 app/(app)/(tabs)/products/@modal/loading.tsx 로 변경 (라우트 그룹 개편)
 */
import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex h-full w-full flex-col overflow-hidden bg-background sm:h-auto sm:max-h-[85vh] sm:max-w-screen-sm sm:rounded-2xl sm:border sm:border-border-subtle sm:shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-subtle bg-surface px-3 py-2">
          <Skeleton className="size-10 rounded-xl" />
          <div className="flex items-center gap-1">
            <Skeleton className="size-10 rounded-xl" />
            <Skeleton className="size-10 rounded-xl" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          <Skeleton className="aspect-square w-full border-b border-border-subtle sm:aspect-[4/3]" />

          <div className="space-y-5 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-9 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-3 w-12 rounded" />
                </div>
              </div>
              <Skeleton className="h-3 w-14 rounded" />
            </div>

            <div className="space-y-3">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-8 w-3/4 rounded-lg" />
              <Skeleton className="h-7 w-1/3 rounded-lg" />
            </div>

            <div className="space-y-2">
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




