/**
 * File Name : features/report/types.ts
 * Description : 신고 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   신고 관련 타입 정의
 * 2026.03.09  임도헌   Modified  신고 처리 정책 설계를 위한 제재 액션/입력 타입 추가
 * 2026.03.30  임도헌   Modified  관리자 신고 리스트가 대상 요약과 부모 콘텐츠 추적 정보를 함께 가질 수 있도록 확장
 * 2026.04.03  임도헌   Modified  신고 대상/처리 액션/관리자 필터 타입을 공용 정의로 통합
 * 2026.04.27  임도헌   Modified  신고 기각 코멘트 payload와 승인 조치 payload 타입을 분리
 * 2026.04.28  임도헌   Modified  신고 처리 모달에서 조치 대상 유저명을 표시할 수 있도록 대상 유저 메타 확장
 * 2026.04.28  임도헌   Modified  삭제 감사 로그 OwnerID의 표시용 유저명 메타 추가
 */

import type { Report } from "@/generated/prisma/client";

/** 신고 대상의 직접 리소스 타입 */
export type ReportTargetType =
  | "USER"
  | "PRODUCT"
  | "POST"
  | "COMMENT"
  | "STREAM"
  | "PRODUCT_MESSAGE"
  | "STREAM_MESSAGE"
  | "REVIEW";

/** 신고 승인 시 관리자가 선택하는 후속 조치 타입 */
export type ReportResolutionAction =
  | "WARN"
  | "DELETE_CONTENT"
  | "TEMP_BAN"
  | "PERMA_BAN";

/** 신고 처리와 감사 로그에서 공통으로 사용하는 관리자 액션 키 */
export type AdminActionType =
  | "ADD_STRIKE" // strike 부여
  | "WARN_USER" // 유저 경고
  | "BAN_USER" // 유저 정지
  | "UNBAN_USER" // 유저 정지 해제
  | "CHANGE_ROLE" // 권한 변경
  | "DELETE_PRODUCT" // 상품 삭제
  | "DELETE_POST" // 게시글 삭제
  | "DELETE_COMMENT" // 댓글 삭제
  | "DELETE_REVIEW" // 리뷰 삭제
  | "DELETE_MESSAGE" // 메시지 삭제
  | "DELETE_STREAM" // 방송 종료
  | "RESOLVE_REPORT" // 신고 처리(승인)
  | "DISMISS_REPORT"; // 신고 기각

/** 신고 승인 시 관리자가 입력해야 하는 조치 데이터 */
export interface ReportResolutionInput {
  action: ReportResolutionAction;
  adminComment: string;
  strike: number;
  durationDays?: number;
  deleteContent?: boolean;
}

/** 신고 기각 시 관리자가 입력해야 하는 처리 사유 */
export interface ReportDismissalInput {
  adminComment: string;
}

/** 신고 승인/기각 처리에 공통으로 전달되는 입력 payload */
export type ReportStatusInput = ReportResolutionInput | ReportDismissalInput;

/** 신고 처리 결과 요약 DTO */
export interface ReportResolutionResult {
  reportId: number;
  status: "RESOLVED" | "DISMISSED";
  action?: ReportResolutionAction;
  targetUserId?: number | null;
  strike?: number;
  durationDays?: number;
}

/** strike 누적을 고려해 계산한 권장 조치 결과 */
export interface ReportResolutionRecommendation {
  action: ReportResolutionAction;
  strike: number;
  durationDays?: number;
  deleteContent: boolean;
}

/** 관리자 신고 목록 조회 입력값 */
export interface ReportFilter {
  status?: string;
  query?: string;
  page?: number;
  limit?: number;
}

/** 관리자 신고 리스트에서 사용하는 확장 신고 아이템 */
export interface AdminReportItem extends Report {
  reporter: {
    id: number;
    username: string;
  };
  /** 댓글/리뷰/메시지처럼 간접 대상일 때도 실제 제재 기준이 되는 유저 ID */
  targetResolvedUserId?: number | null;
  /** 처리 모달에서 운영자가 확인할 수 있는 실제 조치 대상 유저명 */
  targetResolvedUsername?: string | null;
  recentStrikeTotal?: number;
  targetPreview?: string | null;
  targetParentPostId?: number | null;
  targetParentProductId?: number | null;
  targetParentStreamId?: number | null;
  targetParentPreview?: string | null;
}

/** 관리자 신고 목록 API 응답 */
export interface AdminReportListResponse {
  items: AdminReportItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/** 관리자 감사 로그 한 행에 대응하는 화면용 아이템 */
export interface AdminAuditLogItem {
  id: number;
  admin: {
    id: number;
    username: string;
  };
  action: string;
  targetType: string;
  targetId: number;
  reason: string | null;
  /** 삭제 로그 reason 안의 OwnerID에 대응하는 표시용 유저명 */
  reasonOwnerUsername?: string | null;
  created_at: Date;
}

/** 관리자 감사 로그 목록 API 응답 */
export interface AdminAuditLogListResponse {
  items: AdminAuditLogItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/** 관리자 신고 추이 차트의 시리즈 단위 데이터 */
export interface AdminReportInsightSeries {
  name: string;
  color: string;
  values: number[];
}

/** 관리자 신고 사유 분포 차트의 단일 항목 */
export interface AdminReportReasonItem {
  label: string;
  value: number;
  color: string;
}

/** 관리자 신고 대시보드 상단 인사이트 응답 */
export interface AdminReportInsights {
  labels: string[];
  statusSeries: AdminReportInsightSeries[];
  reasonItems: AdminReportReasonItem[];
  summary: {
    pendingCount: number;
    strikeTargetCount: number;
    averageProcessingHours: number;
    recentTotal: number;
  };
}
