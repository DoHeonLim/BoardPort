/**
 * File Name : features/stream/service/comment.ts
 * Description : 녹화본(VodAsset) 댓글 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.23  임도헌   Created   녹화본 댓글 로직 Service 분리
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.02.05  임도헌   Modified  댓글 목록 조회 시 차단된 유저 필터링 추가
 * 2026.02.07  임도헌   Modified  정지 유저 가드(validateUserStatus) 적용
 */

import "server-only";
import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  checkBlockRelation,
  getBlockedUserIds,
} from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";

// 댓글 목록 조회 (Raw)
const getRecordingCommentsRaw = async (
  vodId: number,
  cursor?: number,
  limit = 10,
  viewerId?: number | null
) => {
  const where: any = { vodId };

  // 차단 유저 필터링
  if (viewerId) {
    const blockedIds = await getBlockedUserIds(viewerId);
    if (blockedIds.length > 0) {
      where.userId = { notIn: blockedIds };
    }
  }

  return await db.recordingComment.findMany({
    where,
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
 * - viewerId를 캐시 키에 포함하여 개인화된 캐시 생성
 */
export const getCachedRecordingComments = (
  vodId: number,
  limit = 10,
  viewerId?: number | null
) => {
  const key = `recording-comments-${vodId}-${limit}-user-${viewerId ?? "anon"}`;

  const cached = nextCache(
    async (vid: number, lim: number, uid: number | null) =>
      getRecordingCommentsRaw(vid, undefined, lim, uid),
    [key],
    {
      tags: [
        T.RECORDING_COMMENTS(vodId),
        ...(viewerId ? [T.USER_BLOCK_UPDATE(viewerId)] : []), // 차단 변경 시 캐시 무효화
      ],
    }
  );
  return cached(vodId, limit, viewerId ?? null);
};

/**
 * 추가 댓글 로드 (Non-Cached)
 */
export const getRecordingComments = getRecordingCommentsRaw;

/**
 * 댓글 생성
 * - 작성자의 정지 여부를 확인
 * - 방송 주인과의 차단 관계를 확인
 */
export const createRecordingComment = async (
  vodId: number,
  userId: number,
  payload: string
) => {
  // 정지 유저 체크
  const status = await validateUserStatus(userId);
  if (!status.success) throw new Error("BANNED_USER");

  // 방송 주인 확인 및 차단 검사
  const vod = await db.vodAsset.findUnique({
    where: { id: vodId },
    select: {
      broadcast: { select: { liveInput: { select: { userId: true } } } },
    },
  });

  if (vod?.broadcast.liveInput.userId) {
    const isBlocked = await checkBlockRelation(
      userId,
      vod.broadcast.liveInput.userId
    );
    if (isBlocked) throw new Error("FORBIDDEN");
  }

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
 * - 작성자 권한을 확인하고 삭제
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
