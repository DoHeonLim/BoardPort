/**
 * File Name : features/user/actions/block.ts
 * Description : 유저 차단/해제 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.04  임도헌   Created   toggleBlockAction 구현
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag, revalidatePath } from "next/cache";
import * as T from "@/lib/cacheTags";
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

  if (result.success) {
    // 차단 관계 변경 시, 나의 맞춤형 목록 캐시(제품 목록, 팔로워 등) 무효화
    revalidateTag(T.USER_BLOCK_UPDATE(viewerId));
    // 내 팔로우 목록 초기화
    revalidateTag(T.USER_FOLLOWERS_ID(viewerId));
    revalidateTag(T.USER_FOLLOWING_ID(viewerId));
    // 타겟 팔로우 목록 초기화
    revalidateTag(T.USER_FOLLOWERS_ID(targetId));
    revalidateTag(T.USER_FOLLOWING_ID(targetId));

    if (path) {
      revalidatePath(path);
    }
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
