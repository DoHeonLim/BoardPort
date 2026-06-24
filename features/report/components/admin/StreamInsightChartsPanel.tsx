"use client";

/**
 * File Name : features/report/components/admin/StreamInsightChartsPanel.tsx
 * Description : 관리자 방송 관리 차트 패널
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.18  임도헌   Created   방송 인사이트 차트를 클라이언트 패널로 분리해 ECharts 번들을 필요 시점까지 지연 로드
 */

import nextDynamic from "next/dynamic";
import Link from "next/link";
import AdminChartCard from "@/features/report/components/admin/charts/AdminChartCard";

const AdminTrendChart = nextDynamic(
  () => import("@/features/report/components/admin/charts/AdminTrendChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] animate-pulse rounded-2xl bg-surface-dim/50" />
    ),
  }
);

const AdminDonutChart = nextDynamic(
  () => import("@/features/report/components/admin/charts/AdminDonutChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[320px] animate-pulse rounded-2xl bg-surface-dim/50" />
    ),
  }
);

interface StreamInsightChartsPanelProps {
  labels: string[];
  startsSeries: {
    name: string;
    color: string;
    values: number[];
  }[];
  categorySlices: {
    label: string;
    value: number;
    color: string;
  }[];
  liveCount: number;
}

/**
 * 관리자 방송 인사이트 차트 패널 컴포넌트
 * 최근 방송 시작 추이와 현재 라이브 카테고리 분포를 지연 로딩 차트 카드로 표시
 */
export default function StreamInsightChartsPanel({
  labels,
  startsSeries,
  categorySlices,
  liveCount,
}: StreamInsightChartsPanelProps) {
  const actionLinkClass =
    "focus-ring-soft rounded px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-brand dark:hover:text-brand-light";
  const legendSlot = startsSeries.map((item) => (
    <div key={item.name} className="inline-flex items-center gap-2">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-xs font-medium text-muted">{item.name}</span>
    </div>
  ));
  const totalStarts =
    startsSeries[0]?.values.reduce((acc, value) => acc + value, 0) ?? 0;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
      <AdminChartCard
        title="최근 7일 방송 시작 추이"
        description="방송이 어느 날짜 구간에서 몰리는지 읽는 운영용 추이 패널입니다."
        actionSlot={
          <Link href="/admin/streams" prefetch={false} className={actionLinkClass}>
            현재 라이브 보기
          </Link>
        }
        legendSlot={legendSlot}
        insight={`최근 7일 동안 총 ${totalStarts.toLocaleString()}개의 방송이 시작되었습니다.`}
      >
        <AdminTrendChart labels={labels} series={startsSeries} />
      </AdminChartCard>

      <AdminChartCard
        title="현재 라이브 카테고리 분포"
        description="지금 어떤 카테고리에 운영 시선이 더 필요한지 한눈에 보는 분포 패널입니다."
        actionSlot={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {categorySlices.slice(0, 2).map((slice) => (
              <Link
                key={slice.label}
                href={`/admin/streams?q=${encodeURIComponent(slice.label)}`}
                prefetch={false}
                className={actionLinkClass}
              >
                {slice.label}
              </Link>
            ))}
            <Link
              href="/admin/streams"
              prefetch={false}
              className={actionLinkClass}
            >
              전체 라이브
            </Link>
          </div>
        }
        insight={
          categorySlices[0]
            ? `현재 가장 많은 라이브 카테고리는 '${categorySlices[0].label}'입니다.`
            : "현재 진행 중인 방송이 없어 카테고리 분포가 비어 있습니다."
        }
      >
        <AdminDonutChart
          centerLabel="LIVE"
          centerValue={liveCount.toLocaleString()}
          slices={categorySlices}
        />
      </AdminChartCard>
    </div>
  );
}
