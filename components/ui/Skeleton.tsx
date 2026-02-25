/**
 * File Name : components/ui/Skeleton.tsx
 * Description : 공통 스켈레톤 UI 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   공통 스켈레톤 UI 정의
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 */

import { cn } from "@/lib/utils";

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
