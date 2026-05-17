/**
 * File Name : features/stream/actions/like.ts
 * Description : 녹화본 좋아요 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.04  임도헌   Created   녹화본 좋아요 기능 구현 (legacy liveStream)
 * 2025.09.06  임도헌   Modified  unstable_cache/revalidateTag 제거, 멱등/경합 내성 유지
 * 2025.09.10  임도헌   Modified  like/dislike가 즉시 isLiked/likeCount 반환 (클라 1회왕복)
 * 2025.09.20  임도헌   Modified  VodAsset 단위로 전환 (RecordingLike: @@id([userId, vodId]))
 * 2025.12.22  임도헌   Modified  Prisma 에러 가드 유틸로 변경
 * 2026.01.23  임도헌   Modified  Service(like.ts) 연동 및 서버 액션 역할 정립
 * 2026.01.29  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/streams/[id]/recording/actions/likes.ts -> features/stream/actions/like.ts
 * 2026.03.07  임도헌   Modified  좋아요 에러 코드를 세분화
 * 2026.03.31  임도헌   Modified  상태 조회와 토글 액션 반환 맥락이 보이도록 설명 보강
 * 2026.04.02  임도헌   Modified  파일 설명과 좋아요 액션 주석을 현재 서버 액션 톤으로 정리
 * 2026.05.16  임도헌   Modified  좋아요 액션 에러 분기를 unknown-safe 방식으로 정리
 */
"use server";

import getSession from "@/lib/session";
import {
  getRecordingLikeStatus as getStatusService,
  toggleRecordingLike,
} from "@/features/stream/service/like";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "";

/**
 * 현재 녹화본 좋아요 상태/개수 조회 서버 액션
 *
 * [기능]
 * - 녹화본 좋아요 상태 조회를 service 계층에 위임
 * - 비로그인 사용자 여부와 관계없이 현재 반응 상태와 총 개수를 함께 반환
 *
 * @param {number} vodId - 상태를 조회할 VOD ID
 * @param {number | null} userId - 현재 사용자 ID
 * @returns {ReturnType<typeof getStatusService>} 현재 좋아요 상태와 개수
 */
export async function getRecordingLikeStatus(
  vodId: number,
  userId: number | null
) {
  return getStatusService(vodId, userId);
}

type LikeResult =
  | { success: true; isLiked: boolean; likeCount: number }
  | { success: false; error: string };

/**
 * 녹화본 좋아요 추가 서버 액션
 *
 * [기능]
 * - 로그인 세션을 확인하고
 * - 좋아요 추가를 service 계층에 위임
 * - 실패 코드는 클라이언트 토스트/낙관적 업데이트 분기에 맞춰 표준화된 상수로 반환
 *
 * @param {number} vodId - 좋아요를 추가할 VOD ID
 * @returns {Promise<LikeResult>} 토글 결과
 */
export async function likeRecording(vodId: number): Promise<LikeResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

  try {
    const { likeCount } = await toggleRecordingLike(vodId, session.id, true);
    return { success: true, isLiked: true, likeCount };
  } catch (e: unknown) {
    console.error("likeRecording error:", e);
    const message = getErrorMessage(e);
    if (message === "BANNED_USER")
      return { success: false, error: "BANNED_USER" };
    if (message === "FORBIDDEN")
      return { success: false, error: "FORBIDDEN" };
    if (message === "NOT_FOUND")
      return { success: false, error: "NOT_FOUND" };
    return { success: false, error: "FAILED" };
  }
}

/**
 * 녹화본 좋아요 취소 서버 액션
 *
 * [기능]
 * - 로그인 세션을 확인하고
 * - 좋아요 취소를 service 계층에 위임
 * - 실패 코드는 클라이언트 토스트/낙관적 업데이트 분기에 맞춰 표준화된 상수로 반환
 *
 * @param {number} vodId - 좋아요를 취소할 VOD ID
 * @returns {Promise<LikeResult>} 토글 결과
 */
export async function dislikeRecording(vodId: number): Promise<LikeResult> {
  const session = await getSession();
  if (!session?.id) return { success: false, error: "NOT_LOGGED_IN" };

  try {
    const { likeCount } = await toggleRecordingLike(vodId, session.id, false);
    return { success: true, isLiked: false, likeCount };
  } catch (e: unknown) {
    console.error("dislikeRecording error:", e);
    const message = getErrorMessage(e);
    if (message === "BANNED_USER")
      return { success: false, error: "BANNED_USER" };
    if (message === "FORBIDDEN")
      return { success: false, error: "FORBIDDEN" };
    if (message === "NOT_FOUND")
      return { success: false, error: "NOT_FOUND" };
    return { success: false, error: "FAILED" };
  }
}
