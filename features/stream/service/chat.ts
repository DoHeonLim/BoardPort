/**
 * File Name : features/stream/service/chat.ts
 * Description : 스트리밍 채팅방 및 메시지 관리 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   스트리밍 채팅 메시지 저장 기능 분리
 * 2025.08.23  임도헌   Modified  저장 후 브로드캐스트용 전체 메시지 객체 반환
 * 2025.09.09  임도헌   Modified  에러코드 정합성( CREATE_FAILED ) 통일
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 * 2026.01.19  임도헌   Moved     features/chat/lib -> features/stream/lib
 * 2026.01.23  임도헌   Merged    채팅방 생성/조회, 메시지 생성/조회 로직 통합 및 Session 분리
 * 2026.01.28  임도헌   Modified  주석 보강
 */

import "server-only";
import db from "@/lib/db";
import { isUniqueConstraintError } from "@/lib/errors";
import type { StreamChatMessage } from "@/features/chat/types";

/**
 * 방송(Broadcast) 1:1 채팅방 생성
 * - 이미 존재하면 해당 방 ID를 반환합니다 (Idempotent).
 * - 동시성 문제(Unique Constraint) 발생 시 조회 후 반환으로 fallback 처리합니다.
 *
 * @param {number} broadcastId - 방송 ID
 */
export async function createStreamChatRoom(broadcastId: number) {
  try {
    const room = await db.streamChatRoom.upsert({
      where: { broadcastId },
      update: {},
      create: {
        broadcast: { connect: { id: broadcastId } },
      },
      select: { id: true },
    });

    return { success: true as const, id: room.id };
  } catch (e: any) {
    const maybeUnique =
      isUniqueConstraintError(e, ["broadcastId"]) ||
      e?.message?.includes("Unique");

    if (maybeUnique) {
      try {
        const existing = await db.streamChatRoom.findUnique({
          where: { broadcastId },
          select: { id: true },
        });
        if (existing) return { success: true as const, id: existing.id };
      } catch (err) {
        console.error("[createStreamChatRoom][fallback] failed:", err);
      }
    }
    console.error("[createStreamChatRoom] failed:", e);
    return { success: false as const, error: "채팅방 생성에 실패했습니다." };
  }
}

/**
 * 방송 ID로 채팅방 정보 조회
 */
export const getStreamChatRoom = async (broadcastId: number) => {
  return await db.streamChatRoom.findUnique({
    where: { broadcastId },
    include: {
      broadcast: {
        select: {
          id: true,
          liveInput: { select: { userId: true } }, // host 식별용
        },
      },
    },
  });
};

/**
 * 채팅 메시지 생성
 * - 메시지를 DB에 저장하고, 브로드캐스트를 위해 완성된 메시지 객체를 반환합니다.
 *
 * @param {string} payload - 메시지 내용
 * @param {number} streamChatRoomId - 채팅방 ID
 * @param {number} userId - 작성자 ID
 */
export const createStreamMessage = async (
  payload: string,
  streamChatRoomId: number,
  userId: number
): Promise<
  | { success: true; message: StreamChatMessage }
  | { success: false; error: string }
> => {
  try {
    const row = await db.streamMessage.create({
      data: { payload, streamChatRoomId, userId },
      select: {
        id: true,
        payload: true,
        created_at: true,
        streamChatRoomId: true,
        userId: true,
        user: { select: { username: true, avatar: true } },
      },
    });

    const message: StreamChatMessage = {
      id: row.id,
      payload: row.payload,
      created_at: row.created_at,
      streamChatRoomId: row.streamChatRoomId,
      userId: row.userId,
      user: {
        username: row.user?.username ?? "",
        avatar: row.user?.avatar ?? null,
      },
    };

    return { success: true, message };
  } catch (e) {
    console.error("[createStreamMessage] error:", e);
    return { success: false, error: "CREATE_FAILED" };
  }
};

/**
 * 초기 메시지 목록 조회
 * - 최근 N개의 메시지를 최신순(DESC)으로 조회한 뒤, 시간순(ASC)으로 반환합니다.
 *
 * @param {number} streamChatRoomId - 채팅방 ID
 * @param {number} take - 조회 개수 (Default: 20)
 */
export const getInitialStreamMessages = async (
  streamChatRoomId: number,
  take: number = 20
): Promise<StreamChatMessage[]> => {
  const rows = await db.streamMessage.findMany({
    where: { streamChatRoomId },
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });
  return rows.reverse();
};
