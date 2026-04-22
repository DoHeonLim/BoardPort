"use client";

/**
 * File Name : features/user/components/admin/UserInsightChartsPanel.tsx
 * Description : 관리자 유저 인사이트 차트 패널 지연 로딩 래퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.18  임도헌   Created   ECharts 기반 유저 인사이트 차트를 지연 로딩해 관리자 유저 페이지 초기 부하를 완화
 */

import Link from "next/link";
import nextDynamic from "next/dynamic";
import AdminChartCard from "@/features/report/components/admin/charts/AdminChartCard";

const AdminTrendChart = nextDynamic(
  () => import("@/features/report/components/admin/charts/AdminTrendChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-2xl border border-border-subtle bg-surface-dim/20" />
    ),
  }
);

const AdminDonutChart = nextDynamic(
  () => import("@/features/report/components/admin/charts/AdminDonutChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-2xl border border-border-subtle bg-surface-dim/20" />
    ),
  }
);

interface UserInsightChartsPanelProps {
  labels: string[];
  signupSeries: Array<{
    name: string;
    color: string;
    values: number[];
  }>;
  statusSlices: Array<{
    label: string;
    value: number;
    color: string;
  }>;
  summary: {
    totalUsers: number;
    todaySignups: number;
    bannedUsers: number;
    adminUsers: number;
  };
}

/**
 * 관리자 유저 인사이트 차트 패널 컴포넌트
 * 최근 가입 추이와 회원 상태 분포를 지연 로딩 차트 카드로 묶어 표시
 */
export default function UserInsightChartsPanel({
  labels,
  signupSeries,
  statusSlices,
  summary,
}: UserInsightChartsPanelProps) {
  const actionLinkClass =
    "focus-ring-soft rounded px-1 py-0.5 text-xs font-medium text-muted transition-colors hover:text-brand dark:hover:text-brand-light";
  const legendSlot = signupSeries.map((item) => (
    <div key={item.name} className="inline-flex items-center gap-2">
      <span
        className="size-2.5 rounded-full"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-xs font-medium text-muted">{item.name}</span>
    </div>
  ));
  const signupTotal =
    signupSeries[0]?.values.reduce((acc, value) => acc + value, 0) ?? 0;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.45fr_1fr]">
      <AdminChartCard
        title="최근 30일 가입 추이"
        description="회원 유입 흐름이 언제 올라오는지 읽는 운영용 가입 추이 패널입니다."
        actionSlot={
          <Link
            href="/admin/users"
            prefetch={false}
            className={actionLinkClass}
          >
            회원 목록 보기
          </Link>
        }
        legendSlot={legendSlot}
        insight={`최근 30일 동안 총 ${signupTotal.toLocaleString()}명의 회원이 새로 가입했습니다.`}
      >
        <AdminTrendChart labels={labels} series={signupSeries} />
      </AdminChartCard>

      <AdminChartCard
        title="회원 상태 분포"
        description="일반 회원, 관리자, 제재 계정 비중을 한 번에 보는 상태 분포 패널입니다."
        actionSlot={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/admin/users"
              prefetch={false}
              className={actionLinkClass}
            >
              전체 회원
            </Link>
            <Link
              href="/admin/users?role=ADMIN"
              prefetch={false}
              className={actionLinkClass}
            >
              관리자 보기
            </Link>
            <Link
              href="/admin/users?role=BANNED"
              prefetch={false}
              className={actionLinkClass}
            >
              정지 유저 보기
            </Link>
          </div>
        }
        insight={
          statusSlices[0]
            ? `현재 가장 큰 비중은 '${statusSlices[0].label}' 상태입니다.`
            : "아직 집계된 회원 상태 데이터가 없습니다."
        }
      >
        <AdminDonutChart
          centerLabel="USERS"
          centerValue={summary.totalUsers.toLocaleString()}
          slices={statusSlices}
        />
      </AdminChartCard>
    </div>
  );
}
