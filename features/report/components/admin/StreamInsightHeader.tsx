/**
 * File Name : features/report/components/admin/StreamInsightHeader.tsx
 * Description : 관리자 방송 관리 상단 인사이트 헤더
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   라이브 운영 KPI와 최근 7일 시작 추이/카테고리 분포를 묶은 상단 인사이트 헤더 추가
 * 2026.03.30  임도헌   Modified  라이브 KPI와 카테고리 분포에서 실제 방송 목록 검색으로 이어지는 액션 링크 보강
 */

import AdminChartCard from "@/features/report/components/admin/charts/AdminChartCard";
import AdminTrendChart from "@/features/report/components/admin/charts/AdminTrendChart";
import AdminDonutChart from "@/features/report/components/admin/charts/AdminDonutChart";
import Link from "next/link";

interface StreamInsightHeaderProps {
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
  summary: {
    liveCount: number;
    startedLast24Hours: number;
    endedLast24Hours: number;
    averageBroadcastHours: number;
  };
}

/**
 * 방송 관리 상단 인사이트 헤더
 *
 * [기능]
 * 1. 현재 라이브/시작/종료/평균 길이 KPI를 노출
 * 2. 최근 7일 시작 추이와 현재 카테고리 분포를 함께 제공
 * 3. 차트와 카드에서 관련 방송 목록으로 후속 이동을 제공
 *
 * @param props - 방송 인사이트 추이, 분포, KPI 요약 데이터
 * @returns 방송 관리 상단의 운영 인사이트 헤더
 */
export default function StreamInsightHeader({
  labels,
  startsSeries,
  categorySlices,
  summary,
}: StreamInsightHeaderProps) {
  const summaryCardClass =
    "block rounded-2xl border bg-surface px-5 py-4 shadow-sm transition-colors hover:border-border-strong hover:bg-surface-dim/20";
  const actionLinkClass =
    "text-xs font-semibold text-muted transition-colors hover:text-brand";
  const legendSlot = startsSeries.map((item) => (
    <div key={item.name} className="inline-flex items-center gap-2">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-xs font-semibold text-muted">{item.name}</span>
    </div>
  ));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Link href="/admin/streams" className={`${summaryCardClass} border-border-subtle`}>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            현재 라이브
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-primary">
            {summary.liveCount.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            지금 관리자 화면에서 모니터링 중인 방송 수입니다.
          </p>
        </Link>
        <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            24시간 시작
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-primary">
            {summary.startedLast24Hours.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            최근 하루 동안 새로 시작된 방송 수입니다.
          </p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            24시간 종료
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-primary">
            {summary.endedLast24Hours.toLocaleString()}
          </p>
          <p className="mt-1 text-sm text-muted">
            최근 하루 동안 종료된 방송 수입니다.
          </p>
        </div>
        <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">
            평균 방송 길이
          </p>
          <p className="mt-2 text-3xl font-black tracking-tight text-primary">
            {summary.averageBroadcastHours.toFixed(1)}h
          </p>
          <p className="mt-1 text-sm text-muted">
            최근 7일 종료 방송 기준 평균 진행 시간입니다.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
        <AdminChartCard
          title="최근 7일 방송 시작 추이"
          description="방송이 어느 날짜 구간에서 몰리는지 읽는 운영용 추이 패널입니다."
          actionSlot={
            <Link href="/admin/streams" className={actionLinkClass}>
              현재 라이브 보기
            </Link>
          }
          legendSlot={legendSlot}
          insight={`최근 7일 동안 총 ${startsSeries[0]?.values.reduce((acc, value) => acc + value, 0).toLocaleString() ?? "0"}개의 방송이 시작되었습니다.`}
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
                  className={actionLinkClass}
                >
                  {slice.label}
                </Link>
              ))}
              <Link href="/admin/streams" className={actionLinkClass}>
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
            centerValue={summary.liveCount.toLocaleString()}
            slices={categorySlices}
          />
        </AdminChartCard>
      </div>
    </div>
  );
}
