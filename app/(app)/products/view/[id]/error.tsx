/**
 * File Name : app/(app)/products/view/[id]/error.tsx
 * Description : 상품 상세 오류 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   상품 상세 재시도와 상품 목록 복귀 화면 추가
 */

"use client";

import AppErrorFallback, {
  type RouteErrorBoundaryProps,
} from "@/components/global/AppErrorFallback";

/** 상품 상세 오류를 현재 segment에서 복구하고 상품 목록 복귀 경로를 제공 */
export default function ProductDetailError({
  error,
  reset,
}: RouteErrorBoundaryProps) {
  return (
    <AppErrorFallback
      error={error}
      reset={reset}
      title="상품을 불러오지 못했습니다"
      description="상품 정보를 불러오는 중 문제가 발생했습니다. 다시 시도하거나 상품 목록으로 돌아가 주세요."
    />
  );
}
