/**
 * File Name : features/stream/actions/admin.ts
 * Description : 관리자 스트리밍 관리 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   초기 구현
 */
"use server";

import { getStreamsAdmin, deleteStreamByAdmin } from "../service/admin";
import { verifyAdminAccess } from "@/features/auth/service/authSession";
import { revalidatePath } from "next/cache";
import type { ServiceResult } from "@/lib/types";
import type { AdminStreamListResponse } from "@/features/stream/types";

/**
 * 관리자 방송 목록 조회 Action
 * - 관리자 권한을 검증하고 현재 송출 중인 방송 목록을 조회함
 *
 * @param page - 현재 페이지
 * @param query - 검색어 (제목, 스트리머)
 * @returns {Promise<ServiceResult>} 방송 목록 및 페이징 정보
 */
export async function getStreamsAdminAction(
  page: number,
  query?: string
): Promise<ServiceResult<AdminStreamListResponse>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };
  return await getStreamsAdmin(page, 20, query);
}

/**
 * 관리자 방송 강제 종료 Action
 * - 관리자 권한을 검증하고 특정 방송을 강제로 삭제(종료)함
 * - 종료 후 관리자 목록 및 유저 공개 목록을 갱신함
 *
 * @param broadcastId - 대상 방송 ID
 * @param reason - 종료 사유 (Audit Log 기록용)
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function deleteStreamAdminAction(
  broadcastId: number,
  reason: string
) {
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const res = await deleteStreamByAdmin(auth.adminId, broadcastId, reason);

  if (res.success) {
    revalidatePath("/admin/streams");
    revalidatePath("/streams"); // 유저 목록 갱신
  }
  return res;
}
