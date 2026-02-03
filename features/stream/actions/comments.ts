/**
 * File Name : features/stream/actions/comment.ts
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
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  getRecordingComments as fetchComments,
  getCachedRecordingComments as fetchCached,
  createRecordingComment as createService,
  deleteRecordingComment as deleteService,
} from "@/features/stream/service/comment";
import { streamCommentFormSchema } from "@/features/stream/schemas";

/**
 * 댓글 목록 추가 로드 (무한 스크롤)
 */
export const getRecordingComments = async (
  vodId: number,
  cursor?: number,
  limit = 10
) => {
  return fetchComments(vodId, cursor, limit);
};

/**
 * 초기 댓글 목록 로드 (Cached)
 */
export const getCachedRecordingComments = async (vodId: number, limit = 10) => {
  return fetchCached(vodId, limit);
};

/**
 * 댓글 작성 Action
 * - 로그인 및 입력값 검증 후 Service를 호출합니다.
 * - 성공 시 해당 VOD의 댓글 목록 캐시를 무효화합니다.
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

    revalidateTag(T.RECORDING_COMMENTS(parsed.data.vodId));
    return { success: true as const };
  } catch (e) {
    console.error("댓글 생성 실패:", e);
    return { success: false as const, error: "CREATE_FAILED" as const };
  }
};

/**
 * 댓글 삭제 Action
 * - 로그인 확인 후 Service를 호출합니다.
 * - 성공 시 댓글 목록 캐시를 무효화합니다.
 */
export const deleteRecordingComment = async (
  commentId: number,
  vodId: number
) => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" as const };

  try {
    await deleteService(commentId, session.id);
    revalidateTag(T.RECORDING_COMMENTS(vodId));
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
