/**
 * File Name : features/report/components/admin/ReportInsightHeader.tsx
 * Description : 관리자 신고 관리 상단 인사이트 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   신고 추이, 사유 분포, 운영 병목 요약 카드를 묶은 상단 인사이트 헤더 추가
 * 2026.03.30  임도헌   Modified  KPI/차트 패널에서 바로 관련 신고·유저 화면으로 이어지도록 액션 링크 보강
 */

import AdminChartCard from "@/features/report/components/admin/charts/AdminChartCard";
import AdminStackedBarChart from "@/features/report/components/admin/charts/AdminStackedBarChart";
import AdminBarChart from "@/features/report/components/admin/charts/AdminBarChart";
import Link from "next/link";

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
    "block rounded-2xl border bg-surface px-5 py-4 shadow-sm transition-colors hover:border-border-strong hover:bg-surface-dim/20";
  const actionLinkClass =
    "text-xs font-semibold text-muted transition-colors hover:text-brand";
  const legendSlot = statusSeries.map((item) => (
    <div key={item.name} className="inline-flex items-center gap-2">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-xs font-semibold text-muted">{item.name}</span>
    </div>
  ));
  const topReason = reasonItems.find((item) => item.value > 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Link
          href="/admin/reports?status=PENDING"
          className={`${summaryCardClass} border-danger/20`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            신규 Pending
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-danger">
            {summary.pendingCount.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            지금 운영자가 바로 검토해야 하는 신고 큐입니다.
          </p>
        </Link>
        <Link
          href="/admin/users?role=BANNED"
          className={`${summaryCardClass} border-border-subtle`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            최근 7일 Strike 대상
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-primary">
            {summary.strikeTargetCount.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            제재 누적으로 운영 주의가 필요한 유저 수입니다.
          </p>
        </Link>
        <Link
          href="/admin/reports?status=RESOLVED"
          className={`${summaryCardClass} border-border-subtle`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            평균 처리 시간
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-primary">
            {summary.averageProcessingHours.toFixed(1)}h
          </p>
          <p className="mt-1 text-sm text-muted">
            처리 완료/기각된 신고 기준 평균 처리 소요 시간입니다.
          </p>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <AdminChartCard
          title="최근 14일 신고 접수 추이"
          description="날짜별로 신고가 얼마나 쌓였고, 처리/기각이 어느 정도 따라가고 있는지 읽는 운영용 패널입니다."
          actionSlot={
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link href="/admin/reports?status=PENDING" className={actionLinkClass}>
                대기 큐 보기
              </Link>
              <Link href="/admin/reports?status=RESOLVED" className={actionLinkClass}>
                처리 완료 보기
              </Link>
              <Link href="/admin/reports?status=DISMISSED" className={actionLinkClass}>
                기각 보기
              </Link>
            </div>
          }
          legendSlot={legendSlot}
          insight={`최근 14일 누적 신고 ${summary.recentTotal.toLocaleString()}건, 현재 처리 대기 ${summary.pendingCount.toLocaleString()}건입니다.`}
        >
          <AdminStackedBarChart labels={labels} series={statusSeries} />
        </AdminChartCard>

        <AdminChartCard
          title="최근 14일 신고 사유 분포"
          description="최근 14일 동안 접수된 신고를 기준으로, 정책 이슈가 어디에 몰리는지 빠르게 파악하기 위한 사유별 분포입니다."
          actionSlot={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {topReason ? (
                <Link
                  href={`/admin/reports?q=${encodeURIComponent(topReason.label)}`}
                  className={actionLinkClass}
                >
                  최다 사유 보기
                </Link>
              ) : null}
              <Link href="/admin/reports" className={actionLinkClass}>
                전체 신고 보기
              </Link>
            </div>
          }
          insight={
            topReason
              ? `최근 14일 기준 가장 많이 접수된 사유는 '${topReason.label}'입니다.`
              : "최근 14일 기준 접수된 신고가 없어 사유 분포가 비어 있습니다."
          }
        >
          <AdminBarChart items={reasonItems} />
        </AdminChartCard>
      </div>
    </div>
  );
}
