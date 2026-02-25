/**
 * File Name : features/report/components/admin/dashboard/RecentLogsWidget.tsx
 * Description : 대시보드용 최근 감사 로그 위젯
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   최근 AuditLog 5건 조회
 */

import Link from "next/link";
import db from "@/lib/db";
import TimeAgo from "@/components/ui/TimeAgo";
import {
  ClipboardDocumentListIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { AUDIT_ACTION_LABELS } from "@/features/report/constants";
import { cn } from "@/lib/utils";

/**
 * 최근 감사 로그 위젯
 *
 * [기능]
 * 1. 최신 관리자 활동 로그 5건을 요약하여 표시
 * 2. 활동 유형(Action) 및 시간(TimeAgo) 정보 렌더링
 * 3. 전체 로그 페이지로 이동하는 더보기 링크 제공
 */
export default async function RecentLogsWidget() {
  const logs = await db.auditLog.findMany({
    orderBy: { created_at: "desc" },
    take: 5,
    include: { admin: { select: { username: true } } },
  });

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-border flex justify-between items-center bg-surface-dim/30">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <ClipboardDocumentListIcon className="size-5 text-brand dark:text-brand-light" />
          최근 관리 활동
        </h3>
        <Link
          href="/admin/logs"
          className="text-xs font-bold text-muted hover:text-brand flex items-center gap-1"
        >
          전체보기 <ChevronRightIcon className="size-3" />
        </Link>
      </div>

      <div className="flex-1 p-2">
        {logs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted text-sm py-10">
            활동 기록 없음
          </div>
        ) : (
          <ul className="space-y-1">
            {logs.map((log) => {
              const actionLabel = AUDIT_ACTION_LABELS[log.action] || log.action;

              // 정확한 값 비교로 색상 분류
              const isDanger = [
                "BAN_USER",
                "DELETE_PRODUCT",
                "DELETE_POST",
                "DELETE_STREAM",
              ].includes(log.action);
              const isSuccess = ["UNBAN_USER", "RESOLVE_REPORT"].includes(
                log.action
              );
              const isInfo = ["CHANGE_ROLE", "DISMISS_REPORT"].includes(
                log.action
              );

              return (
                <li
                  key={log.id}
                  className="p-3 rounded-xl hover:bg-surface-dim/50 transition-colors group"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        isDanger && "bg-danger/10 text-danger",
                        isSuccess &&
                          "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                        isInfo && "bg-brand/10 text-brand dark:text-brand-light"
                      )}
                    >
                      {actionLabel}
                    </span>
                    <TimeAgo date={log.created_at} className="text-[10px]" />
                  </div>
                  <p className="text-sm text-primary font-semibold line-clamp-1 mb-1">
                    {log.reason || "사유 미입력"}
                  </p>
                  <p className="text-[11px] text-muted flex items-center gap-1.5">
                    <span className="font-bold text-primary/70">
                      by {log.admin.username}
                    </span>
                    <span className="opacity-30">|</span>
                    <span className="text-[10px] uppercase">
                      {log.targetType} #{log.targetId}
                    </span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
