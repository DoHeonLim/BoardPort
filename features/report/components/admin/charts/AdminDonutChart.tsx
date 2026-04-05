/**
 * File Name : features/report/components/admin/charts/AdminDonutChart.tsx
 * Description : 관리자 대시보드용 도넛 차트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   상태 분포 표현용 공통 도넛 차트를 추가하고 ECharts 기반으로 정리
 * 2026.03.30  임도헌   Modified  ECharts 높이와 컨테이너 크기를 동기화하고 중앙 레이블 정렬을 바로잡아 패널 깨짐을 방지
 */

"use client";

import AdminEChart from "@/features/report/components/admin/charts/AdminEChart";

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface AdminDonutChartProps {
  slices: DonutSlice[];
  centerLabel?: string;
  centerValue?: string;
}

/**
 * 관리자 상태/비중 요약용 도넛 차트
 *
 * [기능]
 * 1. 상태 분포를 도넛 차트와 우측 비율 리스트로 함께 표현
 * 2. 중앙 레이블을 통해 핵심 총합 또는 요약 수치를 강조
 *
 * @param props - 분포 조각, 중앙 레이블, 중앙 값
 * @returns 관리자 대시보드와 인사이트 헤더에서 재사용하는 도넛 차트
 */
export default function AdminDonutChart({
  slices,
  centerLabel = "전체",
  centerValue,
}: AdminDonutChartProps) {
  const total = slices.reduce((acc, slice) => acc + slice.value, 0);

  return (
    <div className="grid items-center gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
      <div className="flex items-center justify-center">
        <div className="relative h-[180px] w-[180px] sm:h-[220px] sm:w-[220px]">
          <AdminEChart
            height="100%"
            option={(theme) => ({
              animationDuration: 500,
              tooltip: {
                trigger: "item",
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
              series: [
                {
                  name: centerLabel,
                  type: "pie",
                  radius: ["58%", "82%"],
                  center: ["50%", "50%"],
                  avoidLabelOverlap: true,
                  label: { show: false },
                  labelLine: { show: false },
                  itemStyle: {
                    borderRadius: 10,
                    borderColor: theme.surface,
                    borderWidth: 4,
                  },
                  data:
                    total > 0
                      ? slices.map((slice) => ({
                          value: slice.value,
                          name: slice.label,
                          itemStyle: { color: slice.color },
                        }))
                      : [
                          {
                            value: 1,
                            name: "데이터 없음",
                            itemStyle: { color: theme.borderSubtle },
                          },
                        ],
                },
              ],
            })}
          />
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="space-y-1 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                {centerLabel}
              </p>
              <p className="text-2xl font-black tracking-tight text-primary sm:text-3xl">
                {centerValue ?? total.toLocaleString()}
              </p>
              <p className="text-[11px] text-muted">현재 관리자 상태 요약</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {slices.map((slice) => {
          const ratio = total === 0 ? 0 : (slice.value / total) * 100;
          return (
            <div key={slice.label} className="px-1 py-1">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-sm font-semibold text-primary">
                    {slice.label}
                  </span>
                </div>
                <span className="text-sm font-black text-primary">
                  {slice.value.toLocaleString()}건
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-dim">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${ratio}%`,
                    backgroundColor: slice.color,
                  }}
                />
              </div>
              <p className="mt-2 text-[11px] font-medium text-muted">
                전체의 {ratio.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
