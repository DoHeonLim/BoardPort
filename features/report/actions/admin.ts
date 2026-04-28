/**
 * File Name : features/report/actions/admin.ts
 * Description : 관리자 신고 관리 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   관리자 권한 검증 및 서비스 호출 액션 구현
 * 2026.03.10  임도헌   Modified  신고 승인 시 조치 유형(payload) 전달과 목록 리밸리데이션 흐름 반영
 * 2026.03.30  임도헌   Modified  신고 인사이트 조회 액션을 추가하고 관리자 페이지를 action 계층으로 통일
 * 2026.04.03  임도헌   Modified  관리자 신고 목록 필터 타입 import를 report/types 공용 정의로 정리
 * 2026.04.27  임도헌   Modified  기각 처리도 관리자 코멘트 payload를 전달할 수 있도록 입력 타입 확장
 */

"use server";

import {
  getReportsAdmin,
  getReportInsights,
  updateReportStatus,
} from "@/features/report/service/admin";
import { verifyAdminAccess } from "@/features/auth/service/authSession";
import { revalidatePath } from "next/cache";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminReportInsights,
  AdminReportListResponse,
  ReportFilter,
  ReportStatusInput,
} from "@/features/report/types";

/**
 * 신고 목록 조회 Action
 *
 * [기능]
 * - 관리자 권한 검증
 * - Service 계층 신고 목록 조회 위임
 *
 * @param filter - 필터 조건 (상태, 페이지 등)
 * @returns {Promise<ServiceResult<AdminReportListResponse>>} 신고 목록 및 페이징 정보
 */
export async function getReportsAdminAction(
  filter: ReportFilter
): Promise<ServiceResult<AdminReportListResponse>> {
  // 관리자 권한 확인
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  // 신고 목록 조회 service 위임
  return await getReportsAdmin(filter);
}

/**
 * 신고 관리 인사이트 조회 Action
 *
 * [기능]
 * - 관리자 권한 검증
 * - 신고 추이/KPI/사유 분포 인사이트 조회 위임
 *
 * @returns {Promise<ServiceResult<AdminReportInsights>>} 신고 관리 인사이트 데이터
 */
export async function getReportInsightsAction(): Promise<
  ServiceResult<AdminReportInsights>
> {
  // 관리자 권한 확인
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  // 인사이트 조회 service 위임
  return await getReportInsights();
}

/**
 * 신고 처리(상태 변경) Action
 *
 * [기능]
 * - 관리자 권한 검증 후 신고를 승인(RESOLVED)하거나 기각(DISMISSED) 처리
 * - 승인 시 조치 유형(`resolution`) payload를 Service 계층으로 전달
 * - 처리 성공 시 목록 페이지 리밸리데이션
 *
 * @param reportId - 대상 신고 ID
 * @param status - 변경할 상태
 * @param resolution - 승인 조치 또는 기각 사유 payload (선택)
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function updateReportAction(
  reportId: number,
  status: "RESOLVED" | "DISMISSED",
  resolution?: ReportStatusInput
): Promise<ServiceResult> {
  // 권한 및 adminId 확보
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error ?? "권한이 없습니다." };
  }

  // 신고 처리 service 위임
  const result = await updateReportStatus(
    auth.adminId,
    reportId,
    status,
    resolution
  );

  if (result.success) {
    // 관리자 신고 목록 재검증
    revalidatePath("/admin/reports");
  }
  return result;
}
