/**
 * File Name : features/stream/actions/comments.ts
 * Description : 녹화본 댓글 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.04  임도헌   Created   녹화본 댓글 작성 및 삭제 서버 액션 구현 (legacy liveStream)
 * 2025.09.20  임도헌   Modified  VodAsset 단위로 전환 (RecordingComment.vodId)
 * 2026.01.23  임도헌   Modified  Service(comment.ts) 연동 및 Controller 역할 정립
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/streams/[id]/recording/actions/comments.ts -> features/stream/actions/comment.ts
 * 2026.02.05  임도헌   Modified  댓글 조회 시 세션 ID 전달
 * 2026.03.04  임도헌   Modified  getRecordingCommentsListAction으로 명칭 변경 및 통합 로직 호출
 * 2026.03.05  임도헌   Modified  Action 내 서버 캐시 무효화(`revalidateTag`) 기능 완전 제거 및 순수 결과 반환 구조로 리팩토링
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use server";

import getSession from "@/lib/session";
import {
  getRecordingCommentsList,
  createRecordingComment as createService,
  deleteRecordingComment as deleteService,
} from "@/features/stream/service/comment";
import { streamCommentFormSchema } from "@/features/stream/schemas";

/**
 * 스트리밍 녹화본(VOD) 댓글 페이징 조회 Server Action
 *
 * [데이터 페칭 및 권한 로직]
 * - 로그인 세션(viewerId) 확인을 통해 대상 VOD에 대한 차단 유저 콘텐츠 필터링 적용
 * - 무한 스크롤 조회를 위한 커서 기반 페이징 데이터 및 다음 커서 정보 반환
 *
 * @param {number} vodId - 댓글을 조회할 녹화본 ID
 * @param {number} [cursor] - 이전 페이지의 마지막 댓글 ID
 * @param {number} [limit=10] - 로드할 댓글 개수
 */
export const getRecordingCommentsListAction = async (
  vodId: number,
  cursor?: number,
  limit = 10
) => {
  const session = await getSession();
  const viewerId = session?.id ?? null;
  return getRecordingCommentsList(vodId, cursor, limit, viewerId);
};

/**
 * 녹화본 댓글 작성 Server Action
 *
 * [데이터 가공 및 권한 로직]
 * - 로그인 세션 확인 및 Zod 스키마(`streamCommentFormSchema`)를 통한 폼 데이터 유효성 검증 적용
 * - Service 레이어를 호출하여 신규 댓글 정보(payload, vodId) 데이터 영속화 처리
 *
 * @param {FormData} formData - 댓글 텍스트 및 녹화본 ID 포함 데이터
 * @returns {Promise<{success: boolean, error?: string}>} 처리 결과 반환
 */
export const createRecordingComment = async (formData: FormData) => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" as const };

  const data = {
    payload: formData.get("payload")?.toString() || "",
    vodId: Number(formData.get("vodId")),
  };

  const parsed = streamCommentFormSchema.safeParse(data);
  if (!parsed.success)
    return { success: false, error: "VALIDATION_FAILED" as const };

  try {
    await createService(
      parsed.data.vodId,
      session.id,
      parsed.data.payload.trim()
    );

    return { success: true as const };
  } catch (e) {
    console.error("댓글 생성 실패:", e);
    return { success: false as const, error: "CREATE_FAILED" as const };
  }
};

/**
 * 녹화본 댓글 삭제 Server Action
 *
 * [데이터 가공 및 권한 로직]
 * - 로그인 세션 확인 및 Service 레이어 호출을 통한 삭제 권한 검증(본인 확인) 적용
 * - 해당 댓글 정보 물리적 삭제(Hard Delete) 처리
 *
 * @param {number} commentId - 삭제할 댓글 ID
 * @returns {Promise<{success: boolean, error?: string}>} 처리 결과 반환
 */
export const deleteRecordingComment = async (commentId: number) => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" as const };

  try {
    await deleteService(commentId, session.id);
    return { success: true as const };
  } catch (e: any) {
    console.error("댓글 삭제 실패:", e);
    if (e.message === "NOT_FOUND")
      return { success: false, error: "NOT_FOUND" as const };
    if (e.message === "FORBIDDEN")
      return { success: false, error: "FORBIDDEN" as const };
    return { success: false, error: "DELETE_FAILED" as const };
  }
};
