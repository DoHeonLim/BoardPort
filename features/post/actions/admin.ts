/**
 * File Name : features/post/actions/admin.ts
 * Description : 관리자용 게시글 관리 Action
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   게시글 관리용 액션 추가
 * 2026.03.31  임도헌   Modified  권한 검증과 service 위임 흐름이 드러나도록 주석 보강
 * 2026.04.02  임도헌   Modified  관리자 액션 파라미터/반환 JSDoc 태그 형식 정리
 */
"use server";

import { deletePostByAdmin, getPostsAdmin } from "../service/admin";
import { verifyAdminAccess } from "@/features/auth/service/authSession";
import { revalidatePath, revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import type { ServiceResult } from "@/lib/types";
import type { AdminPostListResponse } from "@/features/post/types";

/**
 * 관리자 게시글 목록 조회 Action
 *
 * [기능]
 * - 관리자 권한을 먼저 검증하고
 * - 게시글 관리 목록 조회를 service 계층에 위임
 *
 * @param {number} page - 현재 페이지 번호
 * @param {string} [query] - 제목/본문/작성자/ID 검색어
 * @returns {Promise<ServiceResult<AdminPostListResponse>>} 관리자 게시글 목록 결과
 */
export async function getPostsAdminAction(
  page: number,
  query?: string
): Promise<ServiceResult<AdminPostListResponse>> {
  const auth = await verifyAdminAccess();
  if (!auth.success) return { success: false, error: auth.error! };
  return await getPostsAdmin(page, 20, query);
}

/**
 * 관리자 게시글 삭제 Action
 *
 * [기능]
 * - 관리자 권한을 먼저 검증하고
 * - 게시글 강제 삭제를 service 계층에 위임
 * - 성공 시 관리자/사용자 화면의 관련 경로를 함께 최신화
 *
 * @param {number} postId - 강제 삭제할 게시글 ID
 * @param {string} reason - 관리자 삭제 사유
 * @returns {Promise<ServiceResult<{ postId: number; username: string }>>} 강제 삭제 처리 결과
 */
export async function deletePostAdminAction(postId: number, reason: string) {
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const res = await deletePostByAdmin(auth.adminId, postId, reason);

  if (res.success && res.data) {
    revalidateTag(T.POST_DETAIL(postId));
    revalidatePath("/admin/posts");
    revalidatePath("/posts"); // 사용자 화면도 갱신
    revalidatePath(`/profile/${res.data.username}`);
  }
  return res;
}
