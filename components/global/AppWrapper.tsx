/**
 * File Name : components/global/AppWrapper.tsx
 * Description : 앱 전체 레이아웃을 감싸는 Wrapper 컴포넌트 (데스크톱 중앙 정렬 및 배경색 제어)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.29  임도헌   Created
 * 2025.05.29  임도헌   Modified  AppWrapper 컴포넌트 생성 및 적용
 * 2026.01.10  임도헌   Modified  [Rule 3.2] 데스크톱 제약 조건 & 시맨틱 토큰 적용
 * 2026.01.18  임도헌   Moved     components/layout -> components/global
 * 2026.02.07  임도헌   Modified  "use client" 전환 및 Admin 경로에서 모바일 제약 해제 로직 추가
 * 2026.03.20  임도헌   Modified  스트림 라이브/녹화 상세는 일반 앱 폭 제약을 해제해 데스크톱 full-width 쉘 레이아웃을 허용
 * 2026.03.25  임도헌   Modified  TabBar가 실제 앱 셸 폭을 읽을 수 있도록 wrapper id를 명시
 * 2026.04.29  임도헌   Modified  보드게임 카탈로그 목록/상세의 데스크톱 확장 레이아웃을 위해 일반 앱 폭 제약 해제
 */
"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AppWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 앱 전체 라우트용 셸 래퍼
 *
 * - 일반 사용자 경로의 모바일 폭 제약 적용
 * - 관리자/보드게임 카탈로그/스트림 몰입형 상세의 데스크톱 확장 레이아웃 허용
 * - TabBar 폭 측정용 기준 wrapper 제공
 *
 * @param {AppWrapperProps} props - 자식 노드와 추가 className
 * @returns {JSX.Element} 앱 전체 레이아웃 래퍼
 */
export default function AppWrapper({ children, className }: AppWrapperProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isBoardGameCatalogRoute = pathname?.startsWith("/boardgames");
  const isImmersiveStreamRoute =
    /^\/streams\/[^/]+(?:\/recording)?$/.test(pathname ?? "");

  return (
    <div
      id="app-wrapper"
      className={cn(
        "relative min-h-[100dvh] w-full",
        "bg-background dark:bg-background-dark",
        "text-neutral-900 dark:text-neutral-100",
        "transition-colors duration-300",
        // 관리자/보드게임 카탈로그/스트림 몰입형 상세는 데스크톱 폭 제약을 제거
        !isAdmin &&
          !isBoardGameCatalogRoute &&
          !isImmersiveStreamRoute &&
          "sm:max-w-screen-sm sm:mx-auto sm:shadow-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
