/**
 * File Name : components/ui/Skeleton.tsx
 * Description : 공통 스켈레톤 UI 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   공통 스켈레톤 UI 정의
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 * 2026.04.04  임도헌   Modified  export 주석을 보강해 공용 로딩 플레이스홀더 역할을 더 명확히 정리
 */

import { cn } from "@/lib/utils";

/**
 * 카드/리스트/폼 자리 표시자에 재사용하는 최소 스켈레톤 블록 컴포넌트
 *
 * - 공용 pulse 애니메이션 제공
 * - 도메인별 스켈레톤 조합의 기본 재료 역할
 *
 * @param {React.HTMLAttributes<HTMLDivElement>} props - className을 포함한 div 기본 속성
 * @returns {JSX.Element} 공용 스켈레톤 블록
 */
export default function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-700",
        className
      )}
      {...props}
    />
  );
}
