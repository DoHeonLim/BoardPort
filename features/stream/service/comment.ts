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
 * 2026.03.04  임도헌   Modified  `unstable_cache` 및 `revalidateTag` 기반 서버 상태 갱신 방식 제거, 순수 DB 쿼리 로직으로 단일화
 * 2026.03.07  임도헌   Modified  댓글 목록의 정지 유저 은닉 및 삭제 액션 정지 유저 가드 적용
 */

import "server-only";
import db from "@/lib/db";
import {
  checkBlockRelation,
  getBlockedUserIds,
} from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";

/**
 * 녹화본 댓글 목록 조회 로직
 *
 * [데이터 가공 및 권한 제어]
 * - 커서 기반의 페이징 쿼리 수행 및 작성자 정보(UserLite) 조인 반환
 * - 조회자(`viewerId`) 기반 차단 유저의 댓글 목록 원천 필터링 적용
 *
 * @param {number} vodId - VOD ID
 * @param {number} [cursor] - 마지막 댓글 ID
 * @param {number} limit - 페이지당 로드 개수
 * @param {number | null} viewerId - 조회자 ID
 */
export async function getRecordingCommentsList(
  vodId: number,
  cursor?: number,
  limit = 10,
  viewerId?: number | null
) {
  const where: any = {
    vodId,
    user: { bannedAt: null },
  };

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
}

/**
 * 녹화본 댓글 생성 로직
 *
 * [데이터 가공 및 보안 가드]
 * - 작성자의 정지 상태(`validateUserStatus`) 확인 및 이용 제한 가드 적용
 * - 방송 주인과 작성자 간의 양방향 차단 관계(`checkBlockRelation`) 확인
 *
 * @param {number} vodId - 대상 VOD ID
 * @param {number} userId - 작성자 ID
 * @param {string} payload - 댓글 내용
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
 * 녹화본 댓글 삭제 로직
 *
 * [데이터 가공 및 권한 제어]
 * - 댓글 소유자 권한 확인 및 미존재 시 에러 처리
 * - 물리적 삭제 수행
 *
 * @param {number} commentId - 삭제할 댓글 ID
 * @param {number} userId - 요청자 ID
 */
export const deleteRecordingComment = async (
  commentId: number,
  userId: number
) => {
  const status = await validateUserStatus(userId);
  if (!status.success) throw new Error("BANNED_USER");

  const target = await db.recordingComment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!target) throw new Error("NOT_FOUND");
  if (target.userId !== userId) throw new Error("FORBIDDEN");

  await db.recordingComment.delete({ where: { id: commentId } });
};
