/**
 * File Name : features/report/components/admin/dashboard/RecentLogsWidget.tsx
 * Description : 대시보드용 최근 감사 로그 위젯
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   최근 AuditLog 5건 조회
 * 2026.03.23  임도헌   Modified  관리자 대시보드 위젯 셸과 헤더 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.30  임도헌   Modified  감사 로그 대상 추적 링크를 재사용해 대시보드에서도 관련 관리 화면으로 바로 이어지게 정리
 */

import Link from "next/link";
import TimeAgo from "@/components/ui/TimeAgo";
import {
  ClipboardDocumentListIcon,
  ChevronRightIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { AUDIT_ACTION_LABELS } from "@/features/report/constants";
import { getAuditLogTargetUrl } from "@/features/report/utils/adminFormatter";
import { cn } from "@/lib/utils";
import type { AdminAuditLogItem } from "@/features/report/types";

/**
 * 최근 감사 로그 위젯
 *
 * [기능]
 * 1. 최신 관리자 활동 로그 5건을 요약하여 표시
 * 2. 활동 유형(Action), 시간(TimeAgo), 대상 타입/ID 정보를 함께 렌더링
 * 3. 로그 대상이 추적 가능할 때 관련 관리 화면으로 바로 이동하는 링크 제공
 * 4. 전체 로그 페이지로 이동하는 더보기 링크 제공
 */
export default function RecentLogsWidget({
  logs,
}: {
  logs: AdminAuditLogItem[];
}) {
  return (
    <div className="bg-surface rounded-2xl border border-border-subtle shadow-sm flex flex-col h-full overflow-hidden">
      <div className="p-5 border-b border-border-subtle flex justify-between items-center bg-surface-dim/30">
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
              const targetUrl = getAuditLogTargetUrl({
                id: log.id,
                admin: log.admin,
                action: log.action,
                targetType: log.targetType,
                targetId: log.targetId,
                reason: log.reason,
                created_at: log.created_at,
              });

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
                  {targetUrl ? (
                    <div className="mt-2">
                      <Link
                        href={targetUrl}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand transition-colors hover:text-brand-dark"
                      >
                        관련 화면 보기
                        <ArrowTopRightOnSquareIcon className="size-3.5" />
                      </Link>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
