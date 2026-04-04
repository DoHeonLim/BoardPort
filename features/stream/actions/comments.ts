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
 * 2026.03.07  임도헌   Modified  댓글 생성/삭제 에러 코드를 세분화
 * 2026.03.31  임도헌   Modified  Action 역할과 커서 조회/오류 반환 흐름 설명 보강
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
 * [기능]
 * - 커서 기반 무한 스크롤 조회를 service 계층에 위임
 * - 로그인 세션(viewerId) 기준으로 차단 유저 댓글 필터링을 함께 적용
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
 * [기능]
 * - 로그인 세션을 확인하고 Zod 스키마로 입력값을 검증
 * - 녹화본 댓글 생성을 service 계층에 위임
 * - 실패 코드는 클라이언트 토스트/에러 분기에 맞춰 표준화된 상수로 반환
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
  } catch (e: any) {
    console.error("댓글 생성 실패:", e);
    if (e.message === "BANNED_USER")
      return { success: false as const, error: "BANNED_USER" as const };
    if (e.message === "FORBIDDEN")
      return { success: false as const, error: "FORBIDDEN" as const };
    return { success: false as const, error: "CREATE_FAILED" as const };
  }
};

/**
 * 녹화본 댓글 삭제 Server Action
 *
 * [기능]
 * - 로그인 세션을 확인하고 삭제를 service 계층에 위임
 * - 실패 코드는 클라이언트 토스트/에러 분기에 맞춰 표준화된 상수로 반환
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
    if (e.message === "BANNED_USER")
      return { success: false, error: "BANNED_USER" as const };
    if (e.message === "NOT_FOUND")
      return { success: false, error: "NOT_FOUND" as const };
    if (e.message === "FORBIDDEN")
      return { success: false, error: "FORBIDDEN" as const };
    return { success: false, error: "DELETE_FAILED" as const };
  }
};
