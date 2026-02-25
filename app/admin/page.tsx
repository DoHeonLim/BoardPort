/**
 * File Name : app/admin/page.tsx
 * Description : 관리자 대시보드 (주요 통계 요약)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   대시보드 통계 조회 및 카드 UI 구현
 */

import db from "@/lib/db";
import { calculateTrend } from "@/features/report/utils/analytics";
import DashboardStatCard from "@/features/report/components/admin/dashboard/DashboardStatCard";
import RecentReportsWidget from "@/features/report/components/admin/dashboard/RecentReportsWidget";
import RecentLogsWidget from "@/features/report/components/admin/dashboard/RecentLogsWidget";
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
 * - 총 회원, 대기 중인 신고, 등록된 상품 등 핵심 지표(KPI)를 카드 형태로 표시
 * - 최근 신고 내역과 감사 로그(Audit Log)를 위젯으로 제공
 */
export default async function AdminDashboard() {
  // 기준 날짜 계산 (지난달 1일 ~ 말일)
  const now = new Date();
  // 지난달 데이터 비교를 위한 기준 시점 (이번달 1일)
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. 병렬로 주요 통계 데이터 조회
  const [
    userCount,
    prevUserCount,
    reportPendingCount,
    productCount,
    prevProductCount,
    streamCount,
    postCount,
    prevPostCount,
  ] = await Promise.all([
    // User
    db.user.count(),
    db.user.count({ where: { created_at: { lt: thisMonthStart } } }),
    // Report
    db.report.count({ where: { status: "PENDING" } }),
    // Product
    db.product.count(),
    db.product.count({ where: { created_at: { lt: thisMonthStart } } }),
    // Stream (누적)
    db.broadcast.count(),
    // Post
    db.post.count(),
    db.post.count({ where: { created_at: { lt: thisMonthStart } } }),
  ]);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          대시보드
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          보드포트 서비스의 주요 지표를 확인하세요.
        </p>
      </div>

      {/* 1. 상단 통계 카드 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardStatCard
          title="총 회원 수"
          value={userCount}
          icon={<UsersIcon className="size-6 text-blue-500" />}
          trend={calculateTrend(userCount, prevUserCount)}
          href="/admin/users"
        />
        <DashboardStatCard
          title="처리 대기 신고"
          value={reportPendingCount}
          icon={<ExclamationTriangleIcon className="size-6 text-red-500" />}
          highlight={reportPendingCount > 0}
          description="처리가 필요한 신고입니다."
          href="/admin/reports"
        />
        <DashboardStatCard
          title="등록된 상품"
          value={productCount}
          icon={<ShoppingBagIcon className="size-6 text-emerald-500" />}
          trend={calculateTrend(productCount, prevProductCount)}
          href="/admin/products"
        />
        <DashboardStatCard
          title="게시글"
          value={postCount}
          icon={<ChatBubbleLeftRightIcon className="size-6 text-orange-500" />}
          trend={calculateTrend(postCount, prevPostCount)}
          href="/admin/posts"
        />
        <DashboardStatCard
          title="누적 방송"
          value={streamCount}
          icon={<VideoCameraIcon className="size-6 text-purple-500" />}
          href="/admin/streams"
        />
      </div>

      {/* 2. 하단 위젯 영역 (최근 활동) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentReportsWidget />
        <RecentLogsWidget />
      </div>
    </div>
  );
}
