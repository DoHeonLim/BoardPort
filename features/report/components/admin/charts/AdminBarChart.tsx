/**
 * File Name : features/report/components/admin/charts/AdminBarChart.tsx
 * Description : 관리자용 가로 막대 차트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   분포 비교용 공통 가로 막대 차트를 추가하고 ECharts 기반으로 정리
 */

"use client";

import AdminEChart from "@/features/report/components/admin/charts/AdminEChart";

interface BarItem {
  label: string;
  value: number;
  color: string;
}

interface AdminBarChartProps {
  items: BarItem[];
}

/**
 * 관리자 분포 비교용 가로 막대 차트
 *
 * [기능]
 * 1. 카테고리/사유별 분포를 가로 막대와 수치 라벨로 시각화
 * 2. 공용 AdminEChart 래퍼를 통해 테마 토큰과 툴팁 스타일을 공유
 *
 * @param props - 막대 차트에 렌더링할 항목 목록
 * @returns 관리자 인사이트 카드 안에서 사용하는 가로 막대 차트
 */
export default function AdminBarChart({ items }: AdminBarChartProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-dim/10 px-2 py-2">
      <AdminEChart
        height={240}
        option={(theme) => ({
          animationDuration: 500,
          grid: {
            top: 8,
            right: 8,
            bottom: 8,
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
            type: "value",
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
          yAxis: {
            type: "category",
            data: items.map((item) => item.label),
            axisTick: { show: false },
            axisLine: { show: false },
            axisLabel: {
              color: theme.textPrimary,
              fontWeight: 500,
              fontSize: 12,
            },
          },
          series: [
            {
              type: "bar",
              data: items.map((item) => ({
                value: item.value,
                itemStyle: {
                  color: item.color,
                  borderRadius: [0, 8, 8, 0] as [number, number, number, number],
                },
              })),
              barWidth: 18,
              label: {
                show: true,
                position: "right",
                color: theme.textMuted,
                fontSize: 11,
                formatter: (params) => {
                  const rawValue = Array.isArray(params.value)
                    ? params.value[0]
                    : params.value;
                  const value = typeof rawValue === "number" ? rawValue : 0;
                  return `${value.toLocaleString()}건`;
                },
              },
            },
          ],
        })}
      />
    </div>
  );
}
