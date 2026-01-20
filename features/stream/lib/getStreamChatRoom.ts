/**
 * File Name : features/stream/lib/getStreamChatRoom.ts
 * Description : 스트리밍 채팅방 ID 조회 (Broadcast 기준)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.30  임도헌   Created   스트리밍 ID로 채팅방 조회 함수 분리
 * 2025.09.16  임도헌   Modified  LiveStream → Broadcast 기준으로 변경, host = broadcast.liveInput.userId
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 * 2026.01.19  임도헌   Moved     features/chat/lib -> features/stream/lib
 */

import "server-only";
import db from "@/lib/db";

/**
 * getStreamChatRoom
 * - broadcastId @unique 이므로 findUnique 가능
 * - host는 broadcast.liveInput.userId
 */

export const getStreamChatRoom = async (broadcastId: number) => {
  return await db.streamChatRoom.findUnique({
    where: {
      broadcastId,
    },
    include: {
      broadcast: {
        select: {
          id: true,
          liveInput: {
            select: {
              userId: true, // host 식별
            },
          },
        },
      },
    },
  });
};
