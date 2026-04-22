/**
 * File Name : app/(app)/streams/[id]/live-preview/loading.tsx
 * Description : 라이브 미리보기 페이지 로딩 상태
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.09  임도헌   Created   iframe 미리보기 대기 중 썸네일 영역만 안정적으로 유지하는 로딩 상태 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/streams/[id]/live-preview/loading.tsx 에서 app/(app)/streams/[id]/live-preview/loading.tsx 로 변경 (라우트 그룹 개편)
*/

import Skeleton from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="relative flex h-screen w-screen items-center justify-center bg-black">
      <Skeleton className="absolute inset-0 h-full w-full rounded-none bg-white/5" />
      <div className="relative z-10 flex flex-col items-center gap-3">
        <Skeleton className="size-12 rounded-full bg-white/10" />
        <Skeleton className="h-4 w-24 rounded bg-white/10" />
      </div>
    </div>
  );
}

