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
 */
"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AppWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 앱 전체 레이아웃 컨테이너
 *
 * [기능]
 * 1. 일반 사용자 경로: `sm:max-w-screen-sm` 등을 적용하여 모바일 뷰 형태 유지.
 * 2. 관리자 경로(/admin): 제약을 제거하여 Full Width 데스크톱 레이아웃 허용.
 */
export default function AppWrapper({ children, className }: AppWrapperProps) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  return (
    <div
      className={cn(
        "relative min-h-[100dvh] w-full",
        "bg-background dark:bg-background-dark",
        "text-neutral-900 dark:text-neutral-100",
        "transition-colors duration-300",
        // isAdmin일 경우 모바일 제약 제거
        !isAdmin && "sm:max-w-screen-sm sm:mx-auto sm:shadow-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
