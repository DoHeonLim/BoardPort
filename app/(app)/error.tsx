/**
 * File Name : app/(app)/error.tsx
 * Description : 로그인 후 앱 영역 공용 오류 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   앱 라우트 오류의 segment 재시도와 상품 목록 복귀 화면 추가
 */

"use client";

import AppErrorFallback, {
  type RouteErrorBoundaryProps,
} from "@/components/global/AppErrorFallback";

/**
 * 로그인 후 앱 route segment에서 처리하지 못한 오류를 복구 화면으로 전환
 *
 * @param props - Next.js가 전달하는 오류 객체와 segment 재시도 함수
 * @returns 앱 공용 오류 복구 화면
 */
export default function AppError({ error, reset }: RouteErrorBoundaryProps) {
  return <AppErrorFallback error={error} reset={reset} />;
}
