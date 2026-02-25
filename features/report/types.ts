/**
 * File Name : features/report/types.ts
 * Description : 신고 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   신고 관련 타입 정의
 */

import type { Report } from "@/generated/prisma/client";

// 관리자 액션
export type AdminActionType =
  | "BAN_USER" // 유저 정지
  | "UNBAN_USER" // 유저 정지 해제
  | "CHANGE_ROLE" // 권한 변경
  | "DELETE_PRODUCT" // 상품 삭제
  | "DELETE_POST" // 게시글 삭제
  | "RESOLVE_REPORT" // 신고 처리(승인)
  | "DISMISS_REPORT"; // 신고 기각

// 관리자 리스트에서 사용할 리포트 아이템
export interface AdminReportItem extends Report {
  reporter: {
    id: number;
    username: string;
  };
}

// 리스트 API 응답
export interface AdminReportListResponse {
  items: AdminReportItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

// 관리자 감사 로그 아이템
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
  created_at: Date;
}

// 관리자 감사 로그 목록 응답
export interface AdminAuditLogListResponse {
  items: AdminAuditLogItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}
