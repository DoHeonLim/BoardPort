/**
 * File Name : features/report/components/admin/charts/AdminTrendChart.tsx
 * Description : 관리자 대시보드용 다중 추이 차트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   최근 N일 운영 추이를 위한 공통 트렌드 차트를 추가하고 ECharts 기반으로 정리
 * 2026.03.30  임도헌   Modified  모바일 밀도에 맞춰 차트 하단 요약 리듬을 눌러 운영 패널 스캔성을 보강
 */

"use client";

import AdminEChart from "@/features/report/components/admin/charts/AdminEChart";

interface TrendSeries {
  name: string;
  color: string;
  values: number[];
}

interface AdminTrendChartProps {
  labels: string[];
  series: TrendSeries[];
  height?: number;
}

/**
 * 관리자용 다중 시계열 추이 차트
 *
 * [기능]
 * 1. 날짜/시간 구간별 추이를 다중 라인 차트로 렌더링
 * 2. 하단 요약에서 시리즈별 총합과 최신 값을 함께 보여줌
 *
 * @param props - 축 라벨, 시리즈 목록, 차트 높이
 * @returns 관리자 인사이트 카드에서 사용하는 공통 트렌드 차트
 */
export default function AdminTrendChart({
  labels,
  series,
  height = 200,
}: AdminTrendChartProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-dim/10 px-2 py-2">
        <AdminEChart
          height={height}
          option={(theme) => ({
            animationDuration: 500,
            animationEasing: "cubicOut",
            grid: {
              top: 20,
              right: 8,
              bottom: 20,
              left: 8,
              containLabel: true,
            },
            tooltip: {
              trigger: "axis",
              backgroundColor: theme.surface,
              borderColor: theme.borderSubtle,
              borderWidth: 1,
              textStyle: {
                color: theme.textPrimary,
                fontFamily: "var(--font-sans), sans-serif",
              },
              extraCssText:
                "border-radius: 14px; box-shadow: 0 12px 24px rgba(15, 23, 42, 0.14);",
            },
            xAxis: {
              type: "category",
              boundaryGap: false,
              data: labels,
              axisTick: { show: false },
              axisLine: {
                lineStyle: {
                  color: theme.borderSubtle,
                },
              },
              axisLabel: {
                color: theme.textMuted,
                hideOverlap: true,
                margin: 14,
                fontSize: 11,
              },
            },
            yAxis: {
              type: "value",
              splitNumber: 4,
              axisTick: { show: false },
              axisLine: { show: false },
              axisLabel: {
                color: theme.textMuted,
                fontSize: 11,
              },
              splitLine: {
                lineStyle: {
                  color: theme.borderSubtle,
                },
              },
            },
            series: series.map((item) => ({
              name: item.name,
              type: "line",
              smooth: 0.3,
              symbol: "circle",
              symbolSize: 7,
              showSymbol: false,
              emphasis: {
                focus: "series",
                scale: true,
              },
              lineStyle: {
                width: 3,
                color: item.color,
              },
              itemStyle: {
                color: item.color,
                borderColor: theme.surface,
                borderWidth: 2,
              },
              areaStyle: {
                color: item.color,
                opacity: 0.1,
              },
              data: item.values,
            })),
          })}
        />
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-3 border-t border-border-subtle pt-1 sm:grid-cols-2 xl:grid-cols-4">
        {series.map((item) => {
          const total = item.values.reduce((acc, value) => acc + value, 0);
          const latest = item.values[item.values.length - 1] ?? 0;
          return (
            <div key={item.name} className="px-1 py-2">
              <div className="flex items-center gap-2">
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-semibold text-muted">
                  {item.name}
                </span>
              </div>
              <p className="mt-2 text-lg font-black tracking-tight text-primary">
                {total.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted">오늘 {latest.toLocaleString()}건</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
