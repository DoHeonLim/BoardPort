/**
 * File Name : features/report/components/admin/ReportInsightHeader.tsx
 * Description : 관리자 신고 관리 상단 인사이트 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   신고 추이, 사유 분포, 운영 병목 요약 카드를 묶은 상단 인사이트 헤더 추가
 * 2026.03.30  임도헌   Modified  KPI/차트 패널에서 바로 관련 신고·유저 화면으로 이어지도록 액션 링크 보강
 * 2026.04.10  임도헌   Modified  신고 인사이트 헤더의 액션 링크와 KPI weight를 관리자 타이포 정책에 맞춰 정리
 * 2026.04.18  임도헌   Modified  요약 링크 프리패치를 줄이고 차트 패널을 지연 로딩 래퍼로 분리
 * 2026.09.01  임도헌   Modified  태블릿 인사이트 카드를 두 열로 배치해 좁은 카드에서 지표가 압축되지 않도록 조정
 */

import Link from "next/link";
import ReportInsightChartsPanel from "@/features/report/components/admin/ReportInsightChartsPanel";

interface ReportInsightHeaderProps {
  labels: string[];
  statusSeries: Array<{
    name: string;
    color: string;
    values: number[];
  }>;
  reasonItems: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  summary: {
    pendingCount: number;
    strikeTargetCount: number;
    averageProcessingHours: number;
    recentTotal: number;
  };
}

/**
 * 신고 관리 상단 인사이트 헤더
 *
 * [기능]
 * 1. 운영 병목을 읽는 KPI 카드 3종을 제공
 * 2. 최근 신고 추이와 사유 분포 차트를 함께 노출
 * 3. 차트/카드에서 관련 관리 화면으로 후속 이동을 제공
 *
 * @param props - 신고 인사이트 요약, 추이, 사유 분포 데이터
 * @returns 신고 관리 상단의 KPI/차트 묶음 헤더
 */
export default function ReportInsightHeader({
  labels,
  statusSeries,
  reasonItems,
  summary,
}: ReportInsightHeaderProps) {
  const summaryCardClass =
    "focus-ring-strong block rounded-2xl border bg-surface px-5 py-4 shadow-sm transition-colors hover:border-border-strong hover:bg-surface-dim/20";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Link
          href="/admin/reports?status=PENDING"
          prefetch={false}
          className={`${summaryCardClass} border-danger/20`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            신규 Pending
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-danger">
            {summary.pendingCount.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            지금 운영자가 바로 검토해야 하는 신고 큐입니다.
          </p>
        </Link>
        <Link
          href="/admin/users?role=BANNED"
          prefetch={false}
          className={`${summaryCardClass} border-border-subtle`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            최근 7일 Strike 대상
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
            {summary.strikeTargetCount.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            제재 누적으로 운영 주의가 필요한 유저 수입니다.
          </p>
        </Link>
        <Link
          href="/admin/reports?status=RESOLVED"
          prefetch={false}
          className={`${summaryCardClass} border-border-subtle`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            평균 처리 시간
          </p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-primary">
            {summary.averageProcessingHours.toFixed(1)}h
          </p>
          <p className="mt-1 text-sm text-muted">
            처리 완료/기각된 신고 기준 평균 처리 소요 시간입니다.
          </p>
        </Link>
      </div>

      <ReportInsightChartsPanel
        labels={labels}
        statusSeries={statusSeries}
        reasonItems={reasonItems}
        summary={{
          pendingCount: summary.pendingCount,
          recentTotal: summary.recentTotal,
        }}
      />
    </div>
  );
}
