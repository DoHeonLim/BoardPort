/**
 * File Name : components/ui/ViewModeToggleSkeleton.tsx
 * Description : 목록 보기 방식 전환 버튼 공통 로딩 골격
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.13  임도헌   Created   실제 보기 전환 버튼과 동일한 크기·외곽선 구조 추가
 */

import Skeleton from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

/** 리스트·그리드 전환 버튼과 같은 크기의 로딩 골격 */
export default function ViewModeToggleSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-xl border border-border-subtle bg-surface p-1 shadow-sm",
        className
      )}
      aria-hidden="true"
    >
      <Skeleton className="size-9 rounded-lg sm:size-11" />
      <Skeleton className="size-9 rounded-lg sm:size-11" />
    </div>
  );
}
