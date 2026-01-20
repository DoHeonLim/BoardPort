/**
 * File Name : features/stream/lib/createStreamMessage.ts
 * Description : 스트리밍 채팅 메시지 저장 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   스트리밍 채팅 메시지 저장 기능 분리
 * 2025.08.23  임도헌   Modified  저장 후 브로드캐스트용 전체 메시지 객체 반환
 * 2025.09.09  임도헌   Modified  에러코드 정합성( CREATE_FAILED ) 통일
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 * 2026.01.19  임도헌   Moved     features/chat/lib -> features/stream/lib
 */

import db from "@/lib/db";
import type { StreamChatMessage } from "@/types/chat";

type CreateStreamMessageResult =
  | { success: true; message: StreamChatMessage }
  | { success: false; error: string };

/**
 * createStreamMessage
 * - 스트리밍 채팅방에 메시지를 저장하고, 브로드캐스트에 필요한 전체 메시지 객체를 반환
 */
export const createStreamMessage = async (
  payload: string,
  streamChatRoomId: number,
  userId: number
): Promise<CreateStreamMessageResult> => {
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
