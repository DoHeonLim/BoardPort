/**
 * File Name : features/post/actions/delete.ts
 * Description : 게시글 삭제 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   created   app/posts/[id]/actions/posts.ts (deletePost) -> features/post/actions/delete.ts
 * 2026.03.05  임도헌   Modified  개인화된 게시글 목록(POST_LIST 등)의 `revalidateTag` 부수 효과 제거, 공통 데이터(상세) 태그만 유지
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag, revalidatePath } from "next/cache";
import * as T from "@/lib/cacheTags";
import { deletePost as deletePostService } from "@/features/post/service/post";
import { notFound } from "next/navigation";

/**
 * 게시글 삭제 Action
 * - Service 호출 후 상세/목록 캐시 무효화 및 경로 갱신
 *
 * @param {number} postId - 게시글 ID
 */
export async function deletePostAction(postId: number) {
  const session = await getSession();
  if (!session?.id) return notFound();

  const result = await deletePostService(session.id, postId);

  if (result.success) {
    revalidateTag(T.POST_DETAIL(postId));
    revalidatePath("/posts");
  }
}
