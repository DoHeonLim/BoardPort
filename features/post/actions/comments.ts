/**
 * File Name : features/post/actions/comments.ts
 * Description : 댓글 관리 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.06  임도헌   Created   댓글 관련 서버 액션 분리
 * 2025.07.11  임도헌   Modified  댓글 무한 스크롤 구현
 * 2025.11.20  임도헌   Modified  revalidate 태그 네이밍 통일
 * 2025.12.07  임도헌   Modified  조회 전용으로 정리(getComments/getCachedComments만 사용)
 * 2026.01.22  임도헌   Modified  Service 연결, 생성/삭제 Action 추가
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Moved     app/posts/[id]/actions/comments.ts -> features/post/actions/comment.ts
 * 2026.02.05  임도헌   Modified  댓글 조회 시 viewerId 전달 (차단 필터링)
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  getMoreComments as fetchComments,
  getCachedComments as fetchCached,
  createComment as createService,
  deleteComment as deleteService,
} from "@/features/post/service/comment";
import { commentFormSchema } from "@/features/post/schemas";
import type { PostComment } from "@/features/post/types";
import type { ServiceResult } from "@/lib/types";

/**
 * 댓글 목록 추가 로드 Action (무한 스크롤)
 */
export const getComments = async (
  postId: number,
  cursor?: number,
  limit = 10
): Promise<PostComment[]> => {
  const session = await getSession();
  const viewerId = session?.id ?? -1;
  return fetchComments(postId, cursor, limit, viewerId);
};

/**
 * 초기 댓글 목록 로드 Action (Cached)
 */
export const getCachedComments = async (
  postId: number
): Promise<PostComment[]> => {
  const session = await getSession();
  const viewerId = session?.id ?? -1;
  return fetchCached(postId, viewerId);
};

/**
 * 댓글 생성 Action
 * - 로그인 및 입력값 검증 후 Service를 호출
 * - 성공 시 댓글 목록, 게시글 상세(댓글 수), 전체 목록 캐시를 무효화
 *
 * @param {FormData} formData - 댓글 내용 및 게시글 ID
 */
export const createCommentAction = async (
  formData: FormData
): Promise<ServiceResult<{ id: number }>> => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const data = {
    payload: formData.get("payload"),
    postId: formData.get("postId"),
  };
  const parsed = commentFormSchema.safeParse(data);
  if (!parsed.success) return { success: false, error: "입력값 오류" };

  const result = await createService(
    session.id,
    parsed.data.postId,
    parsed.data.payload
  );

  if (result.success) {
    revalidateTag(T.POST_COMMENTS(parsed.data.postId));
    revalidateTag(T.POST_DETAIL(parsed.data.postId));
    revalidateTag(T.POST_LIST());
  }
  return result;
};

/**
 * 댓글 삭제 Action
 * - 로그인 확인 후 Service를 호출
 * - 성공 시 관련 캐시를 무효화
 *
 * @param {number} commentId - 삭제할 댓글 ID
 * @param {number} postId - 게시글 ID
 */
export const deleteCommentAction = async (
  commentId: number,
  postId: number
): Promise<ServiceResult> => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const result = await deleteService(session.id, commentId);

  if (result.success) {
    revalidateTag(T.POST_COMMENTS(postId));
    revalidateTag(T.POST_DETAIL(postId));
    revalidateTag(T.POST_LIST());
  }
  return result;
};
