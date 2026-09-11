/**
 * File Name : features/post/actions/comments.ts
 * Description : 댓글 관리 서버 액션
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
 * 2026.03.31  임도헌   Modified  Action 역할과 댓글 조회/후속 처리 맥락이 보이도록 설명 보강
 * 2026.04.02  임도헌   Modified  댓글 액션 반환/파라미터 JSDoc 태그 형식 정리
 * 2026.05.16  임도헌   Modified  현재 actions 계층 역할에 맞게 파일 설명 정리
 * 2026.08.23  임도헌   Modified  Next.js 16 revalidateTag 만료 프로필 인자 반영
 * 2026.09.09  임도헌   Removed   미사용 댓글 조회 액션 제거 및 쓰기 액션 책임으로 정리
 * 2026.09.09  임도헌   Removed   댓글 통계 분리에 따라 불필요해진 상세 본문 cache 무효화 제거
 */
"use server";

import getSession from "@/lib/session";
import {
  createComment as createService,
  deleteComment as deleteService,
} from "@/features/post/service/comment";
import { commentFormSchema } from "@/features/post/schemas";
import type { ServiceResult } from "@/lib/types";

/**
 * 게시글 댓글 생성 Server Action
 *
 * [기능]
 * - 로그인 세션을 확인하고 Zod 스키마로 입력값을 검증
 * - 댓글 생성을 service 계층에 위임
 * - 성공 결과는 클라이언트의 댓글 목록과 통계 캐시에 반영
 *
 * @param {FormData} formData - 댓글 내용 및 게시글 ID
 * @returns {Promise<ServiceResult<{ id: number }>>} 생성된 댓글 ID 또는 실패 정보
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

  return result;
};

/**
 * 게시글 댓글 삭제 Server Action
 *
 * [기능]
 * - 로그인 세션을 확인하고 삭제를 service 계층에 위임
 * - 성공 결과는 클라이언트의 댓글 목록과 통계 캐시에 반영
 *
 * @param {number} commentId - 삭제할 댓글 ID
 * @returns {Promise<ServiceResult>} 댓글 삭제 처리 결과
 */
export const deleteCommentAction = async (
  commentId: number
): Promise<ServiceResult> => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "로그인이 필요합니다." };

  const result = await deleteService(session.id, commentId);

  return result;
};
