/**
 * File Name : features/post/actions/delete.ts
 * Description : 게시글 삭제 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   created   app/posts/[id]/actions/posts.ts (deletePost) -> features/post/actions/delete.ts
 * 2026.03.05  임도헌   Modified  개인화된 게시글 목록(POST_LIST 등)의 `revalidateTag` 부수 효과 제거, 공통 데이터(상세) 태그만 유지
 * 2026.03.06  임도헌   Modified  삭제 확인 모달 연동을 위해 처리 결과를 클라이언트에서 소비 가능한 형태로 반환
 * 2026.04.02  임도헌   Modified  삭제 액션 반환 설명 JSDoc 보강
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag, revalidatePath } from "next/cache";
import * as T from "@/lib/cacheTags";
import { deletePost as deletePostService } from "@/features/post/service/post";
import { notFound } from "next/navigation";

/**
 * 게시글 삭제 Action
 *
 * [기능]
 * - 로그인 세션을 확인하고
 * - 게시글 삭제를 service 계층에 위임
 * - 성공 시 상세/목록 화면이 바로 최신화되도록 관련 경로를 무효화
 *
 * @param {number} postId - 게시글 ID
 * @returns {Promise<ServiceResult>} 게시글 삭제 처리 결과
 */
export async function deletePostAction(postId: number) {
  const session = await getSession();
  if (!session?.id) return notFound();

  const result = await deletePostService(session.id, postId);

  if (result.success) {
    revalidateTag(T.POST_DETAIL(postId));
    revalidatePath("/posts");
  }

  return result;
}
