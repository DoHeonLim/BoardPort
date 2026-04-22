"use client";

/**
 * File Name : features/report/components/admin/ReportInsightChartsPanel.tsx
 * Description : 관리자 신고 인사이트 차트 패널 지연 로딩 래퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.18  임도헌   Created   ECharts 기반 신고 인사이트 차트를 지연 로딩해 초기 관리자 신고 페이지 부하를 완화
 */

import Link from "next/link";
import nextDynamic from "next/dynamic";
import AdminChartCard from "@/features/report/components/admin/charts/AdminChartCard";

const AdminStackedBarChart = nextDynamic(
  () => import("@/features/report/components/admin/charts/AdminStackedBarChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] animate-pulse rounded-2xl border border-border-subtle bg-surface-dim/20" />
    ),
  }
);

const AdminBarChart = nextDynamic(
  () => import("@/features/report/components/admin/charts/AdminBarChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[240px] animate-pulse rounded-2xl border border-border-subtle bg-surface-dim/20" />
    ),
  }
);

interface ReportInsightChartsPanelProps {
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
    recentTotal: number;
  };
}

/**
 * 관리자 신고 인사이트 차트 패널 컴포넌트
 * 최근 신고 추이와 사유 분포를 지연 로딩 차트 카드로 묶어 표시
 */
export default function ReportInsightChartsPanel({
  labels,
  statusSeries,
  reasonItems,
  summary,
}: ReportInsightChartsPanelProps) {
  const actionLinkClass =
    "focus-ring-soft rounded px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-brand dark:hover:text-brand-light";
  const legendSlot = statusSeries.map((item) => (
    <div key={item.name} className="inline-flex items-center gap-2">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-xs font-medium text-muted">{item.name}</span>
    </div>
  ));
  const topReason = reasonItems.find((item) => item.value > 0);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
      <AdminChartCard
        title="최근 14일 신고 접수 추이"
        description="날짜별로 신고가 얼마나 쌓였고, 처리/기각이 어느 정도 따라가고 있는지 읽는 운영용 패널입니다."
        actionSlot={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/admin/reports?status=PENDING"
              prefetch={false}
              className={actionLinkClass}
            >
              대기 큐 보기
            </Link>
            <Link
              href="/admin/reports?status=RESOLVED"
              prefetch={false}
              className={actionLinkClass}
            >
              처리 완료 보기
            </Link>
            <Link
              href="/admin/reports?status=DISMISSED"
              prefetch={false}
              className={actionLinkClass}
            >
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
                prefetch={false}
                className={actionLinkClass}
              >
                최다 사유 보기
              </Link>
            ) : null}
            <Link
              href="/admin/reports"
              prefetch={false}
              className={actionLinkClass}
            >
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
  );
}
