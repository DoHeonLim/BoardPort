/**
 * File Name : features/report/components/admin/charts/AdminStackedBarChart.tsx
 * Description : 관리자용 누적 막대 차트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   날짜별 상태 누적 분포를 위한 공통 스택 막대 차트를 추가하고 ECharts 기반으로 정리
 * 2026.03.30  임도헌   Modified  신고 접수 추이처럼 날짜별 상태 누적을 읽기 쉽게 모바일 높이와 툴팁 문법에 맞춰 정리
 */

"use client";

import AdminEChart from "@/features/report/components/admin/charts/AdminEChart";

interface StackedSeries {
  name: string;
  color: string;
  values: number[];
}

interface AdminStackedBarChartProps {
  labels: string[];
  series: StackedSeries[];
  height?: number;
}

export default function AdminStackedBarChart({
  labels,
  series,
  height = 220,
}: AdminStackedBarChartProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-dim/10 px-2 py-2">
      <AdminEChart
        height={height}
        option={(theme) => ({
          animationDuration: 500,
          grid: {
            top: 18,
            right: 8,
            bottom: 22,
            left: 8,
            containLabel: true,
          },
          tooltip: {
            trigger: "axis",
            axisPointer: { type: "shadow" },
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
              margin: 12,
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
            type: "bar",
            stack: "reports",
            barWidth: "48%",
            emphasis: {
              focus: "series",
            },
            itemStyle: {
              color: item.color,
              borderRadius: [8, 8, 0, 0],
            },
            data: item.values,
          })),
        })}
      />
    </div>
  );
}
