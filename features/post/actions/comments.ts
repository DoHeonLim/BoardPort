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
 * 2026.03.04  임도헌   Modified  getPostCommentsListAction으로 명칭 변경 및 통합 로직 호출
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  getPostCommentsList,
  createComment as createService,
  deleteComment as deleteService,
} from "@/features/post/service/comment";
import { commentFormSchema } from "@/features/post/schemas";
import type { PostComment } from "@/features/post/types";
import type { ServiceResult } from "@/lib/types";

/**
 * 게시글 댓글 페이징 조회 Server Action
 *
 * [데이터 페칭 전략]
 * - 커서 기반의 무한 스크롤 조회를 위한 데이터 패치 로직
 * - 로그인 세션(viewerId) 확인을 통해 차단 유저의 댓글 필터링 적용
 *
 * @param {number} postId - 조회할 게시글 ID
 * @param {number} [cursor] - 마지막 댓글 ID
 * @param {number} limit - 가져올 개수
 */
export const getPostCommentsListAction = async (
  postId: number,
  cursor?: number,
  limit = 10
): Promise<PostComment[]> => {
  const session = await getSession();
  const viewerId = session?.id ?? null;
  return getPostCommentsList(postId, cursor, limit, viewerId);
};

/**
 * 게시글 댓글 생성 Server Action
 *
 * [데이터 가공 및 캐시 제어 로직]
 * - 로그인 세션 확인 및 Zod 스키마를 통한 입력값 유효성 검증
 * - Service 레이어를 호출하여 신규 댓글 데이터 영속화
 * - 클라이언트 TanStack Query 연동을 위한 결과 객체(ServiceResult) 반환
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
    revalidateTag(T.POST_DETAIL(parsed.data.postId));
  }
  return result;
};

/**
 * 게시글 댓글 삭제 Server Action
 *
 * [데이터 가공 및 권한 제어 로직]
 * - 로그인 세션 검증 및 Service 레이어 호출을 통한 작성자 권한 확인 후 삭제 처리
 * - 클라이언트 캐시 무효화를 유도하기 위한 결과 반환
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
    revalidateTag(T.POST_DETAIL(postId));
  }
  return result;
};
