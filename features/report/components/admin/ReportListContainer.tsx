/**
 * File Name : features/report/components/admin/ReportListContainer.tsx
 * Description : 관리자 신고 목록 테이블 및 필터링
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   데스크톱 최적화 테이블 UI 구현
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import TimeAgo from "@/components/ui/TimeAgo";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import ReportStatusBadge from "@/features/report/components/admin/ReportStatusBadge";
import ReportActionDialog from "@/features/report/components/admin/ReportActionDialog";
import {
  getReportTargetType,
  getReportTargetId,
  getTargetUrl,
} from "@/features/report/utils/adminFormatter";
import { REPORT_REASON_LABELS } from "@/features/report/constants";
import type {
  AdminReportListResponse,
  AdminReportItem,
} from "@/features/report/types";
import { cn } from "@/lib/utils";

interface ReportListContainerProps {
  data: AdminReportListResponse;
  currentStatus: string;
}

/**
 * 관리자 신고 목록 컨테이너
 *
 * [기능]
 * 1. 신고 상태별(대기/처리됨/기각/전체) 탭 필터링 제공
 * 2. 신고 목록(상태, 사유, 대상, 설명, 신고자) 테이블 렌더링
 * 3. 신고 대상(상품/게시글 등) 바로가기 링크 제공
 * 4. '처리하기' 버튼 클릭 시 `ReportActionDialog` 호출
 */
export default function ReportListContainer({
  data,
  currentStatus,
}: ReportListContainerProps) {
  const router = useRouter();
  const [reports, setReports] = useState<AdminReportItem[]>(data.items);
  const [selectedReportId, setSelectedReportId] = useState<number | null>(null);

  // 탭 변경
  const handleTabChange = (status: string) => {
    router.push(`/admin/reports?status=${status}&page=1`); // 탭 변경 시 1페이지로 리셋
  };

  // 처리 성공 시 낙관적 업데이트
  const handleSuccess = (id: number, status: string, comment: string) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status, adminComment: comment } : r
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Filters */}
      <div className="flex gap-2 border-b border-border overflow-x-auto scrollbar-hide">
        {["PENDING", "RESOLVED", "DISMISSED", "ALL"].map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={cn(
              "px-4 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap",
              currentStatus === tab
                ? "border-brand text-brand dark:text-brand-light"
                : "border-transparent text-muted hover:text-primary"
            )}
          >
            {tab === "PENDING"
              ? "대기 중"
              : tab === "RESOLVED"
                ? "처리됨"
                : tab === "DISMISSED"
                  ? "기각됨"
                  : "전체"}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4 w-20">상태</th>
                <th className="px-6 py-4 w-32">사유</th>
                <th className="px-6 py-4 w-40">대상</th>
                <th className="px-6 py-4">설명</th>
                <th className="px-6 py-4 w-32">신고자</th>
                <th className="px-6 py-4 w-32">일시</th>
                <th className="px-6 py-4 w-24 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-muted">
                    신고 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-surface-dim/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <ReportStatusBadge status={report.status} />
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">
                      {REPORT_REASON_LABELS[report.reason]}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="bg-surface-dim px-2 py-1 rounded text-[10px] font-mono text-muted">
                          {getReportTargetType(report)}:{" "}
                          {getReportTargetId(report)}
                        </span>
                        {getTargetUrl(report) && (
                          <Link
                            href={getTargetUrl(report)!}
                            target="_blank"
                            className="text-muted hover:text-brand"
                          >
                            <ArrowTopRightOnSquareIcon className="size-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-muted">
                      {report.description || "-"}
                    </td>
                    <td className="px-6 py-4 text-primary font-medium">
                      {report.reporter.username}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      <TimeAgo date={report.created_at} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedReportId(report.id)}
                        className="text-xs font-bold text-brand dark:text-brand-light hover:underline"
                      >
                        {report.status === "PENDING" ? "처리하기" : "내역보기"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />

      {selectedReportId && (
        <ReportActionDialog
          open={!!selectedReportId}
          onClose={() => setSelectedReportId(null)}
          reportId={selectedReportId}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
