/**
 * File Name : components/providers/ThemeProvider
 * Description : 시스템 테마(다크모드) 설정 Provider
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.13  임도헌   Created
 * 2026.01.18  임도헌   Moved     components/providers -> components/global/providers
 * 2026.01.29  임도헌   Modified  주석 정리
 */
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

interface ThemeProviderProps {
  children: React.ReactNode;
  [key: string]: any;
}

/**
 * next-themes 기반의 테마 관리 Provider
 * - 시스템 설정을 기본값으로 사용하며, class 기반 다크모드를 지원
 * - `app/layout.tsx`에서 최상위를 감싸 사용
 */
export default function ThemeProvider({
  children,
  ...props
}: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
