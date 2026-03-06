/**
 * File Name : features/report/actions/admin.ts
 * Description : 관리자 신고 관리 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   관리자 권한 검증 및 서비스 호출 액션 구현
 */

"use server";

import {
  getReportsAdmin,
  updateReportStatus,
  type ReportFilter,
} from "@/features/report/service/admin";
import { verifyAdminAccess } from "@/features/auth/service/authSession";
import { revalidatePath } from "next/cache";
import type { ServiceResult } from "@/lib/types";
import type { AdminReportListResponse } from "@/features/report/types";

/**
 * 신고 목록 조회 Action
 * - 관리자 권한을 검증하고 Service 계층을 호출
 *
 * @param filter - 필터 조건 (상태, 페이지 등)
 * @returns {Promise<ServiceResult<AdminReportListResponse>>} 신고 목록 및 페이징 정보
 */
export async function getReportsAdminAction(
  filter: ReportFilter
): Promise<ServiceResult<AdminReportListResponse>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  return await getReportsAdmin(filter);
}

/**
 * 신고 처리(상태 변경) Action
 * - 관리자 권한 검증 후 신고를 승인(RESOLVED)하거나 기각(DISMISSED) 처리
 * - 처리 후 목록 페이지를 갱신
 *
 * @param reportId - 대상 신고 ID
 * @param status - 변경할 상태
 * @param adminComment - 관리자 코멘트 (선택)
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function updateReportAction(
  reportId: number,
  status: "RESOLVED" | "DISMISSED",
  adminComment?: string
): Promise<ServiceResult> {
  // 1. 권한 및 adminId 획득
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error ?? "권한이 없습니다." };
  }

  // 2. Service 호출 (adminId 전달)
  const result = await updateReportStatus(
    auth.adminId,
    reportId,
    status,
    adminComment
  );

  if (result.success) {
    revalidatePath("/admin/reports");
  }
  return result;
}
