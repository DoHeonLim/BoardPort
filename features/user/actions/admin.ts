/**
 * File Name : features/user/actions/admin.ts
 * Description : 관리자 유저 관리 Server Actions
 * Author : 임도헌
 *
 * History
 * 2026.02.06  임도헌   Created   관리자 권한 가드 및 유저 관리 액션 구현
 * 2026.02.07  임도헌   Modified  Service에 adminId 주입 및 verifyAdminAccess 적용
 */
"use server";

import { verifyAdminAccess } from "@/features/auth/service/authSession";
import {
  getUsersAdmin,
  updateUserRole,
  toggleUserBan,
  type UserFilter,
} from "@/features/user/service/admin";
import { revalidatePath } from "next/cache";
import type { Role } from "@/generated/prisma/client";
import type { ServiceResult } from "@/lib/types";
import type { AdminUserListResponse } from "@/features/user/types";

/** 유저 목록 조회 액션 */
export async function getUsersAdminAction(
  filter: UserFilter
): Promise<ServiceResult<AdminUserListResponse>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  return await getUsersAdmin(filter);
}

/** 유저 권한 변경 액션 */
export async function updateUserRoleAction(
  userId: number,
  role: Role
): Promise<ServiceResult> {
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const result = await updateUserRole(auth.adminId, userId, role);
  if (result.success) {
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
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const result = await toggleUserBan(
    auth.adminId,
    userId,
    reason,
    durationDays
  );

  if (result.success) {
    revalidatePath("/admin/users");
  }
  return result;
}
