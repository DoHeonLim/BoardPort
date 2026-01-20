/**
 * File Name : features/chat/lib/messages/getInitialMessages.ts
 * Description : 채팅방 메시지 초기 목록 조회 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   채팅방 메시지 초기 목록 조회 로직 분리
 * 2025.07.22  임도헌   Modified  DESC 정렬 후 reverse 로직 설명 추가
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */

import db from "@/lib/db";
import { ChatMessage } from "@/types/chat";

/**
 * getInitialMessages
 * - 채팅방 진입 시 초기 메시지 목록을 불러옴
 * - 최신 메시지 기준으로 limit 개수 조회
 * - 최종적으로 오래된 메시지 → 최신 메시지 순서로 반환
 */
export const getInitialMessages = async (
  chatRoomId: string,
  limit = 20
): Promise<ChatMessage[]> => {
  try {
    const messages = await db.productMessage.findMany({
      where: {
        productChatRoomId: chatRoomId,
      },
      orderBy: { created_at: "desc" }, // 최신순 정렬
      take: limit,
      select: {
        id: true,
        payload: true,
        created_at: true,
        isRead: true,
        user: {
          select: {
            id: true,
            avatar: true,
            username: true,
          },
        },
        productChatRoomId: true,
      },
    });

    // DESC → ASC + ChatMessage 형태로 매핑
    return messages.reverse().map<ChatMessage>((m) => ({
      id: m.id,
      payload: m.payload,
      created_at: m.created_at,
      isRead: m.isRead,
      // Prisma 타입은 string | null 이지만,
      // 이 함수는 chatRoomId 기준으로만 조회하므로
      // null일 경우 현재 chatRoomId로 보정해서 항상 string으로 맞춰줌
      productChatRoomId: m.productChatRoomId ?? chatRoomId,
      user: {
        id: m.user.id,
        username: m.user.username,
        avatar: m.user.avatar,
      },
    }));
  } catch (err: unknown) {
    console.error("getInitialMessages error:", err);
    return [];
  }
};
