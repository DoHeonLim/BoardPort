/**
 * File Name : app/(app)/admin/page.tsx
 * Description : 관리자 대시보드 (주요 통계 요약)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   대시보드 통계 조회 및 카드 UI 구현
 * 2026.03.29  임도헌   Modified  KPI 아래 서비스 활동 추이와 신고 처리 현황 차트를 배치해 관리자 판단 레이어를 보강
 * 2026.03.30  임도헌   Modified  KPI 단위를 지표 의미에 맞게 분리하고 빠른 이동 링크·차트 후속 화면 동선을 보강
 * 2026.04.10  임도헌   Modified  빠른 이동 칩 weight를 관리자 공통 타이포 정책에 맞춰 정리
 * 2026.04.12  임도헌   Moved     파일 경로를 app/admin/page.tsx 에서 app/(app)/admin/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.04.18  임도헌   Modified  차트 구간을 지연 로드해 초기 렌더 부담을 줄이고 관리자 대시보드 접근성 보강 작업을 반영
 * 2026.08.23  임도헌   Modified  Next.js 16 호환 클라이언트 지연 로딩 경계로 관리자 차트 분리
 */

import Link from "next/link";
import { getAdminDashboardAction } from "@/features/admin/actions/dashboard";
import { calculateTrend } from "@/features/report/utils/analytics";
import DashboardStatCard from "@/features/report/components/admin/dashboard/DashboardStatCard";
import RecentReportsWidget from "@/features/report/components/admin/dashboard/RecentReportsWidget";
import RecentLogsWidget from "@/features/report/components/admin/dashboard/RecentLogsWidget";
import AdminOverviewChartsLoader from "@/features/report/components/admin/dashboard/AdminOverviewChartsLoader";
import {
  UsersIcon,
  ExclamationTriangleIcon,
  ShoppingBagIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

/**
 * 대시보드 페이지
 * - 핵심 KPI 카드와 최근 30일 운영 추이를 함께 보여준다.
 * - 빠른 이동 링크와 최근 신고/로그 위젯으로 실제 처리 맥락까지 이어준다.
 */
export default async function AdminDashboard() {
  const result = await getAdminDashboardAction();
  if (!result.success || !result.data) {
    throw new Error("관리자 대시보드 데이터를 불러오지 못했습니다.");
  }

  const { metrics, labels, activitySeries, recentReports, recentLogs } =
    result.data;

  const quickLinks = [
    { href: "/admin/reports", label: "신고 관리" },
    { href: "/admin/users", label: "유저 관리" },
    { href: "/admin/products", label: "상품 관리" },
    { href: "/admin/posts", label: "게시글 관리" },
    { href: "/admin/streams", label: "방송 관리" },
    { href: "/admin/logs", label: "감사 로그" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-primary">대시보드</h2>
        <p className="mt-1 text-sm text-muted">
          보드포트 서비스의 주요 지표를 확인하세요.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring-soft inline-flex items-center rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-surface-dim"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      {/* 핵심 KPI 카드: 각 숫자는 해당 관리 화면으로 바로 이어지는 운영 진입점 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <DashboardStatCard
          title="총 회원 수"
          value={metrics.userCount}
          unit="명"
          icon={<UsersIcon className="size-6 text-blue-500" />}
          trend={calculateTrend(metrics.userCount, metrics.prevUserCount)}
          href="/admin/users"
        />
        <DashboardStatCard
          title="처리 대기 신고"
          value={metrics.reportPendingCount}
          unit="건"
          icon={<ExclamationTriangleIcon className="size-6 text-red-500" />}
          highlight={metrics.reportPendingCount > 0}
          description="처리가 필요한 신고입니다."
          href="/admin/reports?status=PENDING"
        />
        <DashboardStatCard
          title="등록된 상품"
          value={metrics.productCount}
          unit="개"
          icon={<ShoppingBagIcon className="size-6 text-emerald-500" />}
          trend={calculateTrend(metrics.productCount, metrics.prevProductCount)}
          href="/admin/products"
        />
        <DashboardStatCard
          title="게시글"
          value={metrics.postCount}
          unit="개"
          icon={<ChatBubbleLeftRightIcon className="size-6 text-orange-500" />}
          trend={calculateTrend(metrics.postCount, metrics.prevPostCount)}
          href="/admin/posts"
        />
        <DashboardStatCard
          title="현재 라이브"
          value={metrics.liveStreamCount}
          unit="개"
          icon={<VideoCameraIcon className="size-6 text-purple-500" />}
          description="현재 송출 중인 방송 수입니다."
          href="/admin/streams"
        />
      </div>

      {/* 운영 판단용 차트 패널 */}
      <AdminOverviewChartsLoader
        labels={labels}
        activitySeries={activitySeries}
        reportStatusSummary={{
          pending: metrics.reportPendingCount,
          resolved: metrics.reportResolvedCount,
          dismissed: metrics.reportDismissedCount,
        }}
      />

      {/* 최근 활동 위젯 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentReportsWidget reports={recentReports} />
        <RecentLogsWidget logs={recentLogs} />
      </div>
    </div>
  );
}
