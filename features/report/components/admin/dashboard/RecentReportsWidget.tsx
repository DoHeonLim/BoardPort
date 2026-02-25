/**
 * File Name : features/report/components/admin/dashboard/RecentReportsWidget.tsx
 * Description : 대시보드용 최근 신고 내역 위젯
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   최근 Pending 신고 5건 조회
 */

import Link from "next/link";
import db from "@/lib/db";
import TimeAgo from "@/components/ui/TimeAgo";
import {
  ExclamationTriangleIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { REPORT_REASON_LABELS } from "@/features/report/constants";

/**
 * 최근 신고 내역 위젯
 *
 * [기능]
 * 1. 처리 대기 중(PENDING)인 최신 신고 5건을 요약하여 표시
 * 2. 신고 사유 및 신고자 정보를 리스트 형태로 렌더링
 * 3. 클릭 시 해당 신고 목록 필터 페이지로 이동
 */
export default async function RecentReportsWidget() {
  // 최근 접수된 처리 대기(PENDING) 신고 5건 조회
  const reports = await db.report.findMany({
    where: { status: "PENDING" },
    orderBy: { created_at: "desc" },
    take: 5,
    include: {
      reporter: { select: { username: true } },
    },
  });

  return (
    <div className="bg-surface rounded-2xl border border-border shadow-sm flex flex-col h-full">
      <div className="p-5 border-b border-border flex justify-between items-center bg-surface-dim/30">
        <h3 className="font-bold text-primary flex items-center gap-2">
          <ExclamationTriangleIcon className="size-5 text-danger" />
          최근 접수된 신고
        </h3>
        <Link
          href="/admin/reports?status=PENDING"
          className="text-xs font-bold text-muted hover:text-brand flex items-center gap-1"
        >
          전체보기 <ChevronRightIcon className="size-3" />
        </Link>
      </div>

      <div className="flex-1 p-2">
        {reports.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted text-sm py-10">
            대기 중인 신고 없음 ✅
          </div>
        ) : (
          <ul className="space-y-1">
            {reports.map((report) => (
              <li key={report.id}>
                <Link
                  href={`/admin/reports?status=PENDING`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-surface-dim/50 transition-colors group"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-primary">
                      {REPORT_REASON_LABELS[report.reason]}
                    </span>
                    <span className="text-[11px] text-muted">
                      신고자: {report.reporter.username}
                    </span>
                  </div>
                  <TimeAgo date={report.created_at} className="text-[10px]" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
