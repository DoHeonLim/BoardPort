"use client";

/**
 * File Name : features/report/components/admin/dashboard/AdminOverviewCharts.tsx
 * Description : 관리자 대시보드 상단 차트 묶음 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.29  임도헌   Created   관리자 대시보드의 서비스 활동 추이와 운영 처리 현황 차트 섹션 추가
 * 2026.03.30  임도헌   Modified  차트 패널에서 유저/상품/게시글/방송/신고 화면으로 바로 이어지는 후속 액션 링크를 보강
 * 2026.04.10  임도헌   Modified  대시보드 차트 액션 링크와 범례 weight를 관리자 타이포 정책에 맞춰 정리
 * 2026.04.18  임도헌   Modified  대시보드 초기 로드 경계 분리를 위해 차트 섹션을 클라이언트 지연 로드 대상으로 정리
 */

import AdminChartCard from "@/features/report/components/admin/charts/AdminChartCard";
import AdminTrendChart from "@/features/report/components/admin/charts/AdminTrendChart";
import AdminDonutChart from "@/features/report/components/admin/charts/AdminDonutChart";
import Link from "next/link";

interface OverviewSeries {
  name: string;
  color: string;
  values: number[];
}

interface AdminOverviewChartsProps {
  labels: string[];
  activitySeries: OverviewSeries[];
  reportStatusSummary: {
    pending: number;
    resolved: number;
    dismissed: number;
  };
}

/**
 * 관리자 메인 대시보드 상단 차트 묶음
 *
 * [기능]
 * 1. 최근 30일 서비스 활동 추이를 한 번에 비교
 * 2. 신고 처리 상태를 도넛 차트로 요약
 * 3. 각 차트에서 관련 관리자 화면으로 바로 이동 가능하게 연결
 *
 * @param props - 추이 라벨, 도메인별 활동 시리즈, 신고 상태 요약
 * @returns 관리자 메인 대시보드의 개요 차트 섹션
 */
export default function AdminOverviewCharts({
  labels,
  activitySeries,
  reportStatusSummary,
}: AdminOverviewChartsProps) {
  // 범례는 차트 시리즈와 같은 순서/색상 유지
  const activityLegend = activitySeries.map((item) => (
    <div key={item.name} className="inline-flex items-center gap-2">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-xs font-medium text-muted">{item.name}</span>
    </div>
  ));

  // 최근 30일 누적 합이 가장 큰 시리즈를 골라 카드 하단 인사이트 문구에 재사용
  const topSeries = [...activitySeries].sort(
    (left, right) =>
      right.values.reduce((acc, value) => acc + value, 0) -
      left.values.reduce((acc, value) => acc + value, 0)
  )[0];

  // 신고 상태 분포는 대시보드와 신고 관리 화면의 상태 의미를 동일 기준으로 유지
  const moderationSlices = [
    {
      label: "대기",
      value: reportStatusSummary.pending,
      color: "#ef4444",
    },
    {
      label: "처리 완료",
      value: reportStatusSummary.resolved,
      color: "#0f766e",
    },
    {
      label: "기각",
      value: reportStatusSummary.dismissed,
      color: "#64748b",
    },
  ];

  // 도넛 중앙 숫자와 인사이트 문구가 같은 총합 기준을 사용하도록 합산
  const totalModeration = moderationSlices.reduce(
    (acc, item) => acc + item.value,
    0
  );

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
      <AdminChartCard
        title="최근 30일 서비스 활동 추이"
        description="회원 가입, 상품 등록, 게시글 작성, 방송 시작 흐름을 한 번에 읽을 수 있는 운영용 추이 패널입니다."
        actionSlot={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/admin/users"
              className="focus-ring-soft rounded px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
            >
              유저 보기
            </Link>
            <Link
              href="/admin/products"
              className="focus-ring-soft rounded px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
            >
              상품 보기
            </Link>
            <Link
              href="/admin/posts"
              className="focus-ring-soft rounded px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
            >
              게시글 보기
            </Link>
            <Link
              href="/admin/streams"
              className="focus-ring-soft rounded px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-brand dark:hover:text-brand-light"
            >
              방송 보기
            </Link>
          </div>
        }
        legendSlot={activityLegend}
        insight={
          topSeries
            ? `최근 30일 기준 가장 활발한 흐름은 '${topSeries.name}'이며, 현재 대시보드의 주요 성장 축으로 읽힙니다.`
            : undefined
        }
      >
        <AdminTrendChart labels={labels} series={activitySeries} />
      </AdminChartCard>

      <AdminChartCard
        title="운영 처리 현황"
        description="신고 큐가 실제로 어디에 쌓여 있는지 빠르게 판단하기 위한 상태 분포 패널입니다."
        actionSlot={
          <Link
            href="/admin/reports"
            className="focus-ring-soft rounded px-1 py-0.5 text-xs font-medium text-brand transition-colors hover:text-brand-dark dark:text-brand-light dark:hover:text-brand-light"
          >
            신고 관리 보기
          </Link>
        }
        insight={`총 ${totalModeration.toLocaleString()}건 중 처리 대기 ${reportStatusSummary.pending.toLocaleString()}건입니다.`}
      >
        <AdminDonutChart
          centerLabel="신고"
          centerValue={totalModeration.toLocaleString()}
          slices={moderationSlices}
        />
      </AdminChartCard>
    </div>
  );
}
