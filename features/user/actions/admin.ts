/**
 * File Name : features/user/actions/admin.ts
 * Description : 관리자 유저 관리 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   관리자 권한 가드 및 유저 관리 액션 구현
 * 2026.02.07  임도헌   Modified  Service에 adminId 주입 및 verifyAdminAccess 적용
 * 2026.03.30  임도헌   Modified  유저 인사이트 조회 액션을 추가하고 role 기반 관리자 필터 흐름을 정리
 * 2026.04.03  임도헌   Modified  관리자 유저 목록 필터 타입 import를 user/types 공용 정의로 정리
 */
"use server";

import { verifyAdminAccess } from "@/features/auth/service/authSession";
import {
  getUsersAdmin,
  getUsersAdminInsights,
  updateUserRole,
  toggleUserBan,
} from "@/features/user/service/admin";
import { revalidatePath } from "next/cache";
import type { Role } from "@/generated/prisma/client";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminUserInsights,
  AdminUserListResponse,
  UserFilter,
} from "@/features/user/types";

/** 유저 목록 조회 액션 */
export async function getUsersAdminAction(
  filter: UserFilter
): Promise<ServiceResult<AdminUserListResponse>> {
  // 관리자 권한 확인
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  // 관리자 목록 조회 service 위임
  return await getUsersAdmin(filter);
}

/**
 * 유저 인사이트 조회 액션
 *
 * [기능]
 * - 관리자 권한 검증
 * - 최근 가입 추이와 회원 상태 분포 인사이트 조회 위임
 *
 * @returns {Promise<ServiceResult<AdminUserInsights>>} 유저 관리 인사이트 데이터
 */
export async function getUsersAdminInsightsAction(): Promise<
  ServiceResult<AdminUserInsights>
> {
  // 관리자 권한 확인
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  // 인사이트 조회 service 위임
  return await getUsersAdminInsights();
}

/** 유저 권한 변경 액션 */
export async function updateUserRoleAction(
  userId: number,
  role: Role,
  reason?: string
): Promise<ServiceResult> {
  // 관리자 권한 확인
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const result = await updateUserRole(auth.adminId, userId, role, reason);
  if (result.success) {
    // 관리자 목록 재검증
    revalidatePath("/admin/users");
  }
  return result;
}

/** 유저 정지 토글 액션 (기간 포함) */
export async function toggleUserBanAction(
  userId: number,
  reason: string,
  durationDays: number = 0 // 0: 영구, N: 일수
): Promise<ServiceResult<{ banned: boolean }>> {
  // 관리자 권한 확인
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  // 정지 토글 service 위임
  const result = await toggleUserBan(
    auth.adminId,
    userId,
    reason,
    durationDays
  );

  if (result.success) {
    // 관리자 목록 재검증
    revalidatePath("/admin/users");
  }
  return result;
}
