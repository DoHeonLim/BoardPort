/**
 * File Name : features/report/components/admin/AuditLogListContainer.tsx
 * Description : 관리자 감사 로그 목록 UI (반응형 테이블 + 한글 포맷팅)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   컴포넌트 분리 및 반응형 대응
 * 2026.02.26  임도헌   Modified  사유에 whitespace-normal 추가해서 줄바꿈 되도록 변경
 */

"use client";

import TimeAgo from "@/components/ui/TimeAgo";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import { cn } from "@/lib/utils";
import {
  AUDIT_ACTION_LABELS,
  TARGET_TYPE_LABELS,
} from "@/features/report/constants";
import type { AdminAuditLogListResponse } from "@/features/report/types";

interface Props {
  data: AdminAuditLogListResponse;
}

/**
 * 감사 로그 목록 컨테이너
 *
 * [기능]
 * 1. 관리자 활동 로그(시간, 관리자, 액션, 대상, 사유)를 테이블로 표시
 * 2. 로그 액션 타입(삭제/정지 등)에 따라 시각적 배지 스타일 차별화
 * 3. 사유(Reason) 필드의 구조화된 데이터(Title/ID 등)를 파싱하여 가독성 있게 표시
 * 4. 페이지네이션 컴포넌트 통합
 */
export default function AuditLogListContainer({ data }: Props) {
  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4 w-40">일시</th>
                <th className="px-6 py-4 w-32">관리자</th>
                <th className="px-6 py-4 w-32">액션</th>
                <th className="px-6 py-4 w-48">대상</th>
                <th className="px-6 py-4">사유 및 상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-muted">
                    기록된 감사 로그가 없습니다.
                  </td>
                </tr>
              ) : (
                data.items.map((log) => {
                  const actionLabel =
                    AUDIT_ACTION_LABELS[log.action] || log.action;
                  const targetLabel =
                    TARGET_TYPE_LABELS[log.targetType] || log.targetType;

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

                  // 사유 파싱
                  const isStructured = log.reason?.includes("Title:");
                  let displayReason = log.reason;
                  let metaInfo = "";

                  if (isStructured && log.reason) {
                    const parts = log.reason.split(" / ");
                    displayReason = parts[parts.length - 1].replace(
                      "Reason: ",
                      ""
                    );
                    metaInfo = parts.slice(0, parts.length - 1).join(" | ");
                  }

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-surface-dim/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-muted">
                        <TimeAgo date={log.created_at} />
                      </td>
                      <td className="px-6 py-4 font-bold text-primary">
                        {log.admin.username}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded text-[10px] font-black uppercase tracking-wider",
                            isDanger && "bg-danger/10 text-danger",
                            isSuccess &&
                              "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
                            isInfo &&
                              "bg-brand/10 text-brand dark:text-brand-light"
                          )}
                        >
                          {actionLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-primary">
                          {targetLabel}
                        </span>
                        <span className="text-muted ml-1 font-mono text-[10px]">
                          #{log.targetId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-0.5 max-w-md whitespace-normal">
                          {isStructured && metaInfo && (
                            <span className="text-[10px] text-muted/60 truncate">
                              {metaInfo}
                            </span>
                          )}
                          <span className="text-primary truncate font-medium">
                            {displayReason || "-"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AdminPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />
    </div>
  );
}
