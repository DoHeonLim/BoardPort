/**
 * File Name : app/(app)/posts/[id]/error.tsx
 * Description : 게시글 상세 오류 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   게시글 상세 재시도와 게시글 목록 복귀 화면 추가
 */

"use client";

import AppErrorFallback, {
  type RouteErrorBoundaryProps,
} from "@/components/global/AppErrorFallback";

/** 게시글 상세 오류를 현재 segment에서 복구하고 게시글 목록 복귀 경로를 제공 */
export default function PostDetailError({
  error,
  reset,
}: RouteErrorBoundaryProps) {
  return (
    <AppErrorFallback
      error={error}
      reset={reset}
      title="게시글을 불러오지 못했습니다"
      description="게시글 정보를 불러오는 중 문제가 발생했습니다. 다시 시도하거나 게시글 목록으로 돌아가 주세요."
      fallbackHref="/posts"
      fallbackLabel="게시글 목록으로"
    />
  );
}
