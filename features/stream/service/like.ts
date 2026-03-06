/**
 * File Name : features/stream/service/like.ts
 * Description : 녹화본(VodAsset) 좋아요 관리 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.23  임도헌   Created   녹화본 좋아요 로직 Service 분리
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.03.07  임도헌   Modified  정지 유저/차단 관계/존재 여부 가드 추가
 */

import "server-only";
import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import { validateUserStatus } from "@/features/user/service/admin";
import { checkBlockRelation } from "@/features/user/service/block";

/**
 * 좋아요 상태 및 총 개수 조회
 *
 * @param {number} vodId - VOD ID
 * @param {number | null} userId - 조회 유저 ID
 */
export async function getRecordingLikeStatus(
  vodId: number,
  userId: number | null
) {
  const [likeCount, likedRow] = await Promise.all([
    db.recordingLike.count({ where: { vodId } }),
    userId
      ? db.recordingLike.findUnique({
          where: { id: { userId, vodId } },
          select: { userId: true },
        })
      : Promise.resolve(null),
  ]);

  return { isLiked: !!likedRow, likeCount };
}

/**
 * 좋아요 토글
 */
export async function toggleRecordingLike(
  vodId: number,
  userId: number,
  isLike: boolean
) {
  const status = await validateUserStatus(userId);
  if (!status.success) throw new Error("BANNED_USER");

  const vod = await db.vodAsset.findUnique({
    where: { id: vodId },
    select: {
      broadcast: { select: { liveInput: { select: { userId: true } } } },
    },
  });

  if (!vod) throw new Error("NOT_FOUND");

  const ownerId = vod.broadcast.liveInput.userId;
  const isBlocked = await checkBlockRelation(userId, ownerId);
  if (isBlocked) throw new Error("FORBIDDEN");

  try {
    if (isLike) {
      await db.recordingLike.create({
        data: { vodId, userId },
      });
    } else {
      await db.recordingLike.deleteMany({
        where: { vodId, userId },
      });
    }
  } catch (e: any) {
    if (isLike && isUniqueConstraintError(e, ["userId", "vodId"])) {
      // 이미 좋아요 한 경우 무시 (멱등)
    } else {
      throw e;
    }
  }

  const likeCount = await db.recordingLike.count({ where: { vodId } });

  return { success: true, likeCount };
}
