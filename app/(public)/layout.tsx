/**
 * File Name : app/(public)/layout.tsx
 * Description : 공개 페이지 전용 레이아웃
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.12  임도헌   Created   공개 페이지 전용 테마 셸과 모바일 퍼스트 레이아웃 추가
 * 2026.04.20  임도헌   Modified  403 등 공개 상태 페이지에서 Query 훅을 안전하게 사용할 수 있도록 QueryProvider를 연결
 * 2026.08.13  임도헌   Modified  공개 영역 진입 시 이전 인증 사용자의 Query cache 초기화
 */
import ThemeProvider from "@/components/global/providers/ThemeProvider";
import QueryProvider from "@/components/global/providers/QueryProvider";
import GlobalToaster from "@/components/global/GlobalToaster";

/** 인증 없이 접근 가능한 페이지를 공통 공개 레이아웃으로 감싼다. */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider resetOnMount>
        <GlobalToaster />
        <div
          className="
            relative min-h-[100dvh] w-full
            bg-background text-neutral-900 transition-colors
            dark:bg-background-dark dark:text-neutral-100
            sm:mx-auto sm:max-w-screen-sm sm:shadow-xl
          "
        >
          {children}
        </div>
      </QueryProvider>
    </ThemeProvider>
  );
}
