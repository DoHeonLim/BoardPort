/**
 * File Name : features/admin/service/dashboard.ts
 * Description : 관리자 대시보드 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.30  임도헌   Created   admin 페이지에 남아 있던 KPI/차트/위젯 집계를 features service로 분리
 * 2026.03.31  임도헌   Modified  KPI/시계열/위젯 조립 흐름이 읽히도록 설명 주석 보강
 */

import "server-only";

import db from "@/lib/db";
import type { ServiceResult } from "@/lib/types";
import { buildRecentDayBuckets } from "@/features/report/utils/analytics";
import type { AdminDashboardData } from "@/features/admin/types";

/**
 * 관리자 대시보드 데이터 조회
 */
export async function getAdminDashboardData(
  now: Date = new Date()
): Promise<ServiceResult<AdminDashboardData>> {
  try {
    // 월간 비교 기준과 최근 30일 시계열 기준점 계산
    // KPI 비교 기준과 추이 차트 기준을 같은 시점 체계로 유지
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // KPI 카드, 최근 위젯, 활동 추이 집계 병렬 조회
    // 관리자 홈 첫 진입에 필요한 데이터를 한 번에 모아 초기 왕복을 줄이는 구간
    const [
      userCount,
      prevUserCount,
      reportPendingCount,
      reportResolvedCount,
      reportDismissedCount,
      productCount,
      prevProductCount,
      liveStreamCount,
      postCount,
      prevPostCount,
      recentUsers,
      recentProducts,
      recentPosts,
      recentStreams,
      recentReports,
      recentLogs,
    ] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { created_at: { lt: thisMonthStart } } }),
      db.report.count({ where: { status: "PENDING" } }),
      db.report.count({ where: { status: "RESOLVED" } }),
      db.report.count({ where: { status: "DISMISSED" } }),
      db.product.count(),
      db.product.count({ where: { created_at: { lt: thisMonthStart } } }),
      db.broadcast.count({ where: { status: "CONNECTED" } }),
      db.post.count(),
      db.post.count({ where: { created_at: { lt: thisMonthStart } } }),
      db.user.findMany({
        where: { created_at: { gte: thirtyDaysAgo } },
        select: { created_at: true },
      }),
      db.product.findMany({
        where: { created_at: { gte: thirtyDaysAgo } },
        select: { created_at: true },
      }),
      db.post.findMany({
        where: { created_at: { gte: thirtyDaysAgo } },
        select: { created_at: true },
      }),
      db.broadcast.findMany({
        where: { created_at: { gte: thirtyDaysAgo } },
        select: { created_at: true },
      }),
      db.report.findMany({
        where: { status: "PENDING" },
        orderBy: { created_at: "desc" },
        take: 5,
        include: {
          reporter: { select: { id: true, username: true } },
        },
      }),
      db.auditLog.findMany({
        orderBy: { created_at: "desc" },
        take: 5,
        include: { admin: { select: { id: true, username: true } } },
      }),
    ]);

    // 30일 기준 활동 추이 버킷 정규화
    // 회원/상품/게시글/방송 데이터를 같은 날짜 축으로 맞춰 비교 가능하게 만듬
    const userBuckets = buildRecentDayBuckets(
      recentUsers.map((item) => item.created_at),
      30,
      now
    );
    const productBuckets = buildRecentDayBuckets(
      recentProducts.map((item) => item.created_at),
      30,
      now
    );
    const postBuckets = buildRecentDayBuckets(
      recentPosts.map((item) => item.created_at),
      30,
      now
    );
    const streamBuckets = buildRecentDayBuckets(
      recentStreams.map((item) => item.created_at),
      30,
      now
    );

    // 화면 조립용 DTO 반환
    // page 레이어가 추가 가공 없이 바로 사용할 수 있는 최종 응답 형태
    return {
      success: true,
      data: {
        metrics: {
          userCount,
          prevUserCount,
          reportPendingCount,
          reportResolvedCount,
          reportDismissedCount,
          productCount,
          prevProductCount,
          liveStreamCount,
          postCount,
          prevPostCount,
        },
        labels: userBuckets.labels,
        activitySeries: [
          {
            name: "회원 가입",
            color: "#2563eb",
            values: userBuckets.values,
          },
          {
            name: "상품 등록",
            color: "#0f766e",
            values: productBuckets.values,
          },
          {
            name: "게시글 작성",
            color: "#f97316",
            values: postBuckets.values,
          },
          {
            name: "방송 시작",
            color: "#7c3aed",
            values: streamBuckets.values,
          },
        ],
        recentReports: recentReports.map((report) => ({
          id: report.id,
          reason: report.reason,
          created_at: report.created_at,
          reporter: report.reporter,
        })),
        recentLogs: recentLogs.map((log) => ({
          id: log.id,
          admin: log.admin,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          reason: log.reason,
          created_at: log.created_at,
        })),
      },
    };
  } catch (error) {
    console.error("[getAdminDashboardData Error]:", error);
    return {
      success: false,
      error: "관리자 대시보드 데이터를 불러오지 못했습니다.",
    };
  }
}
