/**
 * File Name : features/admin/types.ts
 * Description : 관리자 대시보드 도메인 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.30  임도헌   Created   관리자 대시보드 KPI/차트/위젯 데이터를 service-action으로 분리하기 위한 타입 추가
 * 2026.03.31  임도헌   Modified  대시보드 각 영역과 타입 용도가 바로 보이도록 필드 설명 보강
 */

import type { ReportReason } from "@/generated/prisma/client";
import type { AdminAuditLogItem } from "@/features/report/types";

export interface AdminDashboardTrendSeries {
  /** 활동 추이 차트 범례 이름 */
  name: string;
  /** 공용 차트에서 사용하는 시리즈 색상 */
  color: string;
  /** labels 배열과 같은 순서로 맞춘 시계열 값 */
  values: number[];
}

export interface AdminDashboardMetrics {
  /** 전체 회원 수 */
  userCount: number;
  /** 이번 달 이전까지 누적 회원 수 */
  prevUserCount: number;
  /** 현재 처리 대기 중인 신고 수 */
  reportPendingCount: number;
  /** 처리 완료 신고 수 */
  reportResolvedCount: number;
  /** 기각된 신고 수 */
  reportDismissedCount: number;
  /** 전체 상품 수 */
  productCount: number;
  /** 이번 달 이전까지 누적 상품 수 */
  prevProductCount: number;
  /** 현재 라이브 방송 수 */
  liveStreamCount: number;
  /** 전체 게시글 수 */
  postCount: number;
  /** 이번 달 이전까지 누적 게시글 수 */
  prevPostCount: number;
}

export interface AdminDashboardRecentReportItem {
  /** 신고 식별자 */
  id: number;
  /** 최근 신고 위젯에서 보여줄 사유 */
  reason: ReportReason;
  /** 위젯 정렬/상대 시각 표시에 쓰는 생성 시각 */
  created_at: Date;
  /** 신고자 요약 정보 */
  reporter: {
    id: number;
    username: string;
  };
}

/**
 * 관리자 대시보드 화면 조립용 응답 타입
 * KPI 카드, 활동 추이 차트, 최근 신고/감사 로그 위젯이 같은 응답을 공유합니다.
 */
export interface AdminDashboardData {
  metrics: AdminDashboardMetrics;
  labels: string[];
  activitySeries: AdminDashboardTrendSeries[];
  recentReports: AdminDashboardRecentReportItem[];
  recentLogs: AdminAuditLogItem[];
}
