/**
 * File Name : features/report/components/admin/dashboard/AdminOverviewChartsLoader.tsx
 * Description : 관리자 차트의 브라우저 전용 지연 로딩 경계
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   Next.js 16 Server Component의 ssr:false 제한에 맞춰 클라이언트 경계 분리
 */

"use client";

import type { ComponentProps } from "react";
import dynamic from "next/dynamic";
import type AdminOverviewCharts from "./AdminOverviewCharts";

type AdminOverviewChartsProps = ComponentProps<typeof AdminOverviewCharts>;

const LazyAdminOverviewCharts = dynamic(() => import("./AdminOverviewCharts"), {
  ssr: false,
  loading: () => <AdminOverviewChartsFallback />,
});

/**
 * 관리자 개요 차트가 로드되는 동안 동일한 레이아웃의 스켈레톤을 표시한다.
 *
 * @returns 관리자 차트용 로딩 대체 UI
 */
function AdminOverviewChartsFallback() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
      <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="h-6 w-40 rounded-full bg-surface-dim" />
        <div className="mt-3 h-4 w-full max-w-xl rounded-full bg-surface-dim/80" />
        <div className="mt-6 h-[280px] rounded-2xl border border-border-subtle bg-surface-dim/30" />
      </div>
      <div className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm">
        <div className="h-6 w-32 rounded-full bg-surface-dim" />
        <div className="mt-3 h-4 w-full rounded-full bg-surface-dim/80" />
        <div className="mt-6 h-[280px] rounded-2xl border border-border-subtle bg-surface-dim/30" />
      </div>
    </div>
  );
}

/**
 * 관리자 개요 차트를 브라우저 환경에서만 지연 로딩한다.
 *
 * @param props - 관리자 개요 차트에 전달할 지표 데이터
 * @returns 클라이언트 전용 관리자 개요 차트
 */
export default function AdminOverviewChartsLoader(
  props: AdminOverviewChartsProps
) {
  return <LazyAdminOverviewCharts {...props} />;
}
