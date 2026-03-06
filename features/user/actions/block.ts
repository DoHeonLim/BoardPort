/**
 * File Name : features/user/actions/block.ts
 * Description : 유저 차단/해제 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.04  임도헌   Created   toggleBlockAction 구현
 * 2026.03.05  임도헌   Modified  차단 시 발생하던 광범위한 `revalidateTag` 호출 제거 및 단일 진실 공급원(SSOT)을 로컬 Query Cache로 전환
 */
"use server";

import getSession from "@/lib/session";
import { revalidatePath } from "next/cache";
import {
  blockUserService,
  getMyBlockedUsers,
  unblockUserService,
} from "@/features/user/service/block";
import { USER_ERRORS } from "@/features/user/constants";
import type { ServiceResult } from "@/lib/types";

/**
 * 차단/해제 토글 Action
 *
 * [프로세스]
 * 1. 세션 확인 후 Service 계층을 호출
 * 2. 성공 시 `USER_BLOCK_UPDATE` 태그를 무효화하여 사용자의 개인화된 목록 캐시를 갱신
 * 3. 필요 시 특정 경로(`path`)의 페이지를 강제 리프레시
 *
 * @param {number} targetId - 대상 유저 ID
 * @param {"block" | "unblock"} intent - 실행 의도
 * @param {string} [path] - 리밸리데이션 경로 (옵션)
 * @returns {Promise<ServiceResult>} 처리 결과
 */
export async function toggleBlockAction(
  targetId: number,
  intent: "block" | "unblock",
  path?: string
): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: USER_ERRORS.NOT_LOGGED_IN };
  }

  const viewerId = session.id;

  const result =
    intent === "block"
      ? await blockUserService(viewerId, targetId)
      : await unblockUserService(viewerId, targetId);

  if (result.success && path) {
    revalidatePath(path);
  }

  return result;
}

/**
 * 내 차단 목록 조회 Action
 * - 차단 관리 모달에서 초기 데이터를 로드할 때 사용
 *
 * @returns {Promise<Array>} 차단된 유저 목록 (상세 정보 포함)
 */
export async function getMyBlockedUsersAction() {
  const session = await getSession();
  if (!session?.id) return [];
  return await getMyBlockedUsers(session.id);
}
