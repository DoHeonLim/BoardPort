/**
 * File Name : features/report/components/admin/ReportStatusBadge.tsx
 * Description : 신고 상태 뱃지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created
 */

import { cn } from "@/lib/utils";

/**
 * 신고 상태 뱃지
 *
 * [기능]
 * 1. 각 신고 상태의 뱃지를 렌더링
 */
export default function ReportStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING:
      "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    RESOLVED:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    DISMISSED:
      "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700",
  };

  const labels: Record<string, string> = {
    PENDING: "처리 대기",
    RESOLVED: "조치 완료",
    DISMISSED: "신고 기각",
  };

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-medium border",
        styles[status] || styles.PENDING
      )}
    >
      {labels[status] || status}
    </span>
  );
}
