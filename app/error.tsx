/**
 * File Name : app/error.tsx
 * Description : 루트 하위 라우트 그룹 공용 오류 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   앱·공개 layout 초기화 오류의 재시도와 홈 복귀 화면 추가
 */

"use client";

import AppErrorFallback, {
  type RouteErrorBoundaryProps,
} from "@/components/global/AppErrorFallback";
import ThemeProvider from "@/components/global/providers/ThemeProvider";

/**
 * 루트 layout 아래 route group에서 상위로 전파된 오류를 복구 화면으로 전환
 *
 * - 하위 ThemeProvider가 마운트되기 전 실패해도 시스템 테마를 적용
 * - 정적 루트 layout 자체 오류는 대상이 아니므로 별도 global-error는 두지 않음
 *
 * @param props - Next.js가 전달하는 오류 객체와 segment 재시도 함수
 * @returns 테마가 적용된 루트 오류 복구 화면
 */
export default function RootError({ error, reset }: RouteErrorBoundaryProps) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AppErrorFallback
        error={error}
        reset={reset}
        fallbackHref="/"
        fallbackLabel="홈으로"
      />
    </ThemeProvider>
  );
}
