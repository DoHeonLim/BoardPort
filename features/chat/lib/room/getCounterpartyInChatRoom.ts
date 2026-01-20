/**
 * File Name : features/chat/lib/room/getCounterpartyInChatRoom.ts
 * Description : 제품 채팅방에서 viewer 기준 상대 유저(counterparty) 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.02  임도헌   Created   viewerId 기준 상대 유저 헬퍼 추가
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */

import "server-only";
import db from "@/lib/db";
import type { ChatUser } from "@/types/chat";

/**
 * 주어진 제품 채팅방에서 viewer가 아닌 "상대 유저"를 반환한다.
 * - viewer가 방에 속해 있지 않으면 null
 * - 1:1 채팅 기준, viewer 이외 첫 번째 유저를 counterparty로 간주
 */
export async function getCounterpartyInChatRoom(
  chatRoomId: string,
  viewerId: number
): Promise<ChatUser | null> {
  const room = await db.productChatRoom.findFirst({
    where: {
      id: chatRoomId,
      users: {
        some: { id: viewerId }, // viewer가 이 방에 속해 있는지 검증
      },
    },
    select: {
      users: {
        select: {
          id: true,
          username: true,
          avatar: true,
        },
      },
    },
  });

  if (!room) return null;

  const other = room.users.find((u) => u.id !== viewerId);
  if (!other) return null;

  return {
    id: other.id,
    username: other.username,
    avatar: other.avatar ?? null,
  };
}
