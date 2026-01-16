/**
File Name : components/layout/AppWrapper
Description : 앱 전체 레이아웃을 감싸는 Wrapper 컴포넌트 (데스크톱 중앙 정렬 및 배경색 제어)
Author : 임도헌

History
Date        Author   Status    Description
2025.05.29  임도헌   Created
2025.05.29  임도헌   Modified  AppWrapper 컴포넌트 생성 및 적용
2026.01.10  임도헌   Modified  [Rule 3.2] 데스크톱 제약 조건 & 시맨틱 토큰 적용
*/
import { cn } from "@/lib/utils"; // tailwind-merge or clsx 유틸

interface AppWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 앱 전체에서 사용하는 레이아웃의 기본 틀
 * 다크모드, 배경색, 중앙 정렬, 전환 효과 등을 포함
 */
export default function AppWrapper({ children, className }: AppWrapperProps) {
  return (
    <div
      className={cn(
        "relative min-h-[100dvh] w-full",
        "bg-background dark:bg-background-dark",
        "text-neutral-900 dark:text-neutral-100",
        "transition-colors duration-300",
        "sm:max-w-screen-sm sm:mx-auto sm:shadow-xl",
        className
      )}
    >
      {children}
    </div>
  );
}
