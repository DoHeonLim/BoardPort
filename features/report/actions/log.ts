/**
 * File Name : features/report/actions/log.ts
 * Description : 관리자 감사 로그 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.30  임도헌   Created   감사 로그 페이지도 page-action-service 흐름을 따르도록 관리자 조회 action 추가
 */

"use server";

import { verifyAdminAccess } from "@/features/auth/service/authSession";
import { getAuditLogsAdmin } from "@/features/report/service/log";
import type { ServiceResult } from "@/lib/types";
import type { AdminAuditLogListResponse } from "@/features/report/types";

/**
 * 관리자 감사 로그 조회 Action
 *
 * [기능]
 * - 관리자 권한 검증
 * - 검색어와 빠른 필터(action/targetType)를 포함한 감사 로그 조회 위임
 *
 * @param page - 현재 페이지
 * @param query - 검색어
 * @param limit - 페이지당 항목 수
 * @param filters - 액션/대상 타입 빠른 필터
 * @returns {Promise<ServiceResult<AdminAuditLogListResponse>>} 감사 로그 목록과 페이징 정보
 */
export async function getAuditLogsAdminAction(
  page = 1,
  query?: string,
  limit = 20,
  filters?: {
    action?: string;
    targetType?: string;
  }
): Promise<ServiceResult<AdminAuditLogListResponse>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  return await getAuditLogsAdmin(page, query, limit, filters);
}
