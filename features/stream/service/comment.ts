/**
 * File Name : features/stream/service/comment.ts
 * Description : 녹화본(VodAsset) 댓글 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.23  임도헌   Created   녹화본 댓글 로직 Service 분리
 * 2026.01.28  임도헌   Modified  주석 보강
 */

import "server-only";
import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";

// 댓글 목록 조회 (Raw)
const getRecordingCommentsRaw = async (
  vodId: number,
  cursor?: number,
  limit = 10
) => {
  return await db.recordingComment.findMany({
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
};

/**
 * 초기 댓글 목록 조회 (Cached)
 */
export const getCachedRecordingComments = (vodId: number, limit = 10) => {
  const cached = nextCache(
    async (vid: number, lim: number) =>
      getRecordingCommentsRaw(vid, undefined, lim),
    ["recording-comments", String(vodId), String(limit)],
    { tags: [T.RECORDING_COMMENTS(vodId)] }
  );
  return cached(vodId, limit);
};

/**
 * 추가 댓글 로드 (Non-Cached)
 */
export const getRecordingComments = getRecordingCommentsRaw;

/**
 * 댓글 생성
 */
export const createRecordingComment = async (
  vodId: number,
  userId: number,
  payload: string
) => {
  await db.recordingComment.create({
    data: {
      payload,
      vodId,
      userId,
    },
  });
};

/**
 * 댓글 삭제
 * - 작성자 권한을 확인하고 삭제합니다.
 */
export const deleteRecordingComment = async (
  commentId: number,
  userId: number
) => {
  const target = await db.recordingComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!target) throw new Error("NOT_FOUND");
  if (target.userId !== userId) throw new Error("FORBIDDEN");

  await db.recordingComment.delete({ where: { id: commentId } });
};
