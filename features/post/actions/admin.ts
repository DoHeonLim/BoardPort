/**
 * File Name : features/post/actions/admin.ts
 * Description : 관리자용 게시글 관리 Action
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   게시글 관리용 액션 추가
 */
"use server";

import { deletePostByAdmin, getPostsAdmin } from "../service/admin";
import { verifyAdminAccess } from "@/features/auth/service/authSession";
import { revalidatePath } from "next/cache";
import type { ServiceResult } from "@/lib/types";
import type { AdminPostListResponse } from "@/features/post/types";

/**
 * 관리자 게시글 목록 조회 Action
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
 */
export async function deletePostAdminAction(postId: number, reason: string) {
  const auth = await verifyAdminAccess();
  if (!auth.success || !auth.adminId) {
    return { success: false, error: auth.error! };
  }

  const res = await deletePostByAdmin(auth.adminId, postId, reason);

  if (res.success) {
    revalidatePath("/admin/posts");
    revalidatePath("/posts"); // 사용자 화면도 갱신
  }
  return res;
}
