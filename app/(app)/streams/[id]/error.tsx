/**
 * File Name : app/(app)/streams/[id]/error.tsx
 * Description : 방송 상세 오류 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   방송 상세 재시도와 방송 목록 복귀 화면 추가
 */

"use client";

import AppErrorFallback, {
  type RouteErrorBoundaryProps,
} from "@/components/global/AppErrorFallback";

/** 방송 상세 오류를 현재 segment에서 복구하고 방송 목록 복귀 경로를 제공 */
export default function StreamDetailError({
  error,
  reset,
}: RouteErrorBoundaryProps) {
  return (
    <AppErrorFallback
      error={error}
      reset={reset}
      title="방송을 불러오지 못했습니다"
      description="방송 정보를 불러오는 중 문제가 발생했습니다. 다시 시도하거나 방송 목록으로 돌아가 주세요."
      fallbackHref="/streams"
      fallbackLabel="방송 목록으로"
    />
  );
}
