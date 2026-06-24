/**
 * File Name : features/stream/actions/admin.ts
 * Description : 관리자 스트리밍 관리 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   초기 구현
 * 2026.03.30  임도헌   Modified  방송 인사이트 조회 액션을 추가하고 관리자 페이지를 action 계층으로 통일
 * 2026.04.02  임도헌   Modified  관리자 스트림 액션 JSDoc 보강
 */
"use server";

import {
  getStreamsAdmin,
  getStreamsAdminInsights,
  deleteStreamByAdmin,
} from "../service/admin";
import { verifyAdminAccess } from "@/features/auth/service/authSession";
import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import type { ServiceResult } from "@/lib/types";
import type {
  AdminStreamInsights,
  AdminStreamListResponse,
} from "@/features/stream/types";

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
 * 방송 관리 인사이트 조회 Action
 *
 * [기능]
 * - 관리자 권한 검증
 * - 방송 KPI/추이/카테고리 분포 인사이트 조회 위임
 *
 * @returns {Promise<ServiceResult<AdminStreamInsights>>} 방송 관리 인사이트 데이터
 */
export async function getStreamsAdminInsightsAction(): Promise<
  ServiceResult<AdminStreamInsights>
> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };

  return await getStreamsAdminInsights();
}

/**
 * 관리자 방송 강제 종료 Action
 * - 관리자 권한을 검증하고 특정 방송을 강제로 삭제(종료)함
 * - 종료 후 관리자 목록 및 유저 공개 목록을 갱신함
 *
 * @param broadcastId - 대상 방송 ID
 * @param reason - 종료 사유 (Audit Log 기록용)
 * @returns {Promise<ServiceResult<{ username: string }>>} 처리 결과
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

  if (res.success && res.data) {
    revalidateTag(T.BROADCAST_DETAIL(broadcastId));
    revalidatePath("/admin/streams");
    revalidatePath("/streams"); // 유저 공개 목록 갱신
    revalidatePath(`/profile/${res.data.username}/channel`);
  }
  return res;
}
