/**
 * File Name : app/streams/[id]/recording/actions/comments
 * Description : 녹화본 댓글 관련 서버 액션 (VodAsset 단위)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.04  임도헌   Created   녹화본 댓글 작성 및 삭제 서버 액션 구현 (legacy liveStream)
 * 2025.09.20  임도헌   Modified  VodAsset 단위로 전환 (RecordingComment.vodId)
 */

"use server";

import getSession from "@/lib/session";
import db from "@/lib/db";
import { revalidateTag, unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { streamCommentFormSchema } from "@/features/stream/lib/streamCommentFormSchema";

// 페이징 조회
export const getRecordingComments = async (
  vodId: number,
  cursor?: number,
  limit = 10
) => {
  const comments = await db.recordingComment.findMany({
    where: { vodId },
    take: limit,
    skip: cursor ? 1 : 0,
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { id: "desc" },
    select: {
      id: true,
      payload: true,
      created_at: true,
      user: { select: { id: true, username: true, avatar: true } },
    },
  });

  return comments; // 타입은 StreamComment[]
};

/** 첫 페이지 캐시: 태그와 키에 vodId 포함해 충돌 방지 */
export const getCachedRecordingComments = (vodId: number, limit = 10) => {
  const cached = nextCache(
    // cursor 없이 첫 페이지만 캐시
    async (vid: number, lim: number) =>
      getRecordingComments(vid, undefined, lim),
    ["recording-comments", String(vodId), String(limit)],
    { tags: [T.RECORDING_COMMENTS(vodId)] }
  );
  return cached(vodId, limit);
};

/** 댓글 작성 */
export const createRecordingComment = async (formData: FormData) => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" as const };

  const data = {
    payload: formData.get("payload")?.toString() || "",
    vodId: Number(formData.get("vodId")),
  };
  const result = streamCommentFormSchema.safeParse(data);
  if (!result.success)
    return { success: false, error: "VALIDATION_FAILED" as const };

  try {
    await db.recordingComment.create({
      data: {
        payload: result.data.payload.trim(),
        vodId: result.data.vodId,
        userId: session.id,
      },
    });
    // 목록 캐시 무효화
    revalidateTag(T.RECORDING_COMMENTS(result.data.vodId));
    return { success: true as const };
  } catch (e) {
    console.error("댓글 생성 실패:", e);
    return { success: false as const, error: "CREATE_FAILED" as const };
  }
};

/** 댓글 삭제 (작성자 본인만) */
export const deleteRecordingComment = async (
  commentId: number,
  vodId: number
) => {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" as const };

  try {
    const target = await db.recordingComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true },
    });
    if (!target) return { success: false, error: "NOT_FOUND" as const };
    if (target.userId !== session.id) {
      return { success: false, error: "FORBIDDEN" as const };
    }

    await db.recordingComment.delete({ where: { id: commentId } });
    revalidateTag(T.RECORDING_COMMENTS(vodId));
    return { success: true as const };
  } catch (e) {
    console.error("댓글 삭제 실패:", e);
    return { success: false as const, error: "DELETE_FAILED" as const };
  }
};
