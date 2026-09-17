/**
 * File Name : features/report/components/admin/AdminListEmptyState.tsx
 * Description : 관리자 목록 공용 빈 상태 안내
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.12  임도헌   Created   검색·필터 초기화 동선을 포함한 관리자 목록 공용 빈 상태 추가
 */

import Link from "next/link";
import { cn } from "@/lib/utils";

interface AdminListEmptyStateProps {
  title: string;
  description: string;
  resetHref?: string;
  className?: string;
  panel?: boolean;
}

/**
 * 관리자 목록 공용 빈 상태
 */
export default function AdminListEmptyState({
  title,
  description,
  resetHref,
  className,
  panel = false,
}: AdminListEmptyStateProps) {
  return (
    <div
      className={cn(
        "px-5 py-12 text-center",
        panel && "rounded-2xl border border-border-subtle bg-surface shadow-sm",
        className
      )}
    >
      <p className="text-sm font-bold text-primary">{title}</p>
      <p className="mt-2 text-sm text-muted">{description}</p>
      {resetHref && (
        <Link
          href={resetHref}
          className="btn-secondary focus-ring-soft mt-5 inline-flex min-h-[44px] items-center justify-center px-5 text-sm font-medium"
        >
          검색·필터 초기화
        </Link>
      )}
    </div>
  );
}
