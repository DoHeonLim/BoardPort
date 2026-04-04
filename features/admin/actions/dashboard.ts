/**
 * File Name : features/admin/actions/dashboard.ts
 * Description : 관리자 대시보드 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.30  임도헌   Created   관리자 대시보드 집계를 app에서 분리하기 위한 action 추가
 * 2026.03.31  임도헌   Modified  Action 역할과 반환 맥락이 바로 보이도록 JSDoc 보강
 */

"use server";

import { verifyAdminAccess } from "@/features/auth/service/authSession";
import { getAdminDashboardData } from "@/features/admin/service/dashboard";
import type { ServiceResult } from "@/lib/types";
import type { AdminDashboardData } from "@/features/admin/types";

/**
 * 관리자 대시보드 데이터 조회 Action
 *
 * [기능]
 * - 관리자 권한을 먼저 검증하고
 * - 대시보드 KPI/차트/위젯 집계를 service 계층에 위임
 *
 * @returns {Promise<ServiceResult<AdminDashboardData>>} 대시보드 화면 조립에 필요한 집계 결과
 */
export async function getAdminDashboardAction(): Promise<
  ServiceResult<AdminDashboardData>
> {
  // 관리자 권한 확인
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  // 대시보드 집계 service 위임
  return await getAdminDashboardData();
}
