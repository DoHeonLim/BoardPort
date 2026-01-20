/**
 * File Name : features/chat/lib/messages/getUnreadCount.ts
 * Description : 읽지 않은 메시지 갯수 조회
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   읽지 않은 메시지 카운트 로직 분리
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */
"use server";

import db from "@/lib/db";

// 다른 유저가 보낸 읽지 않은 메시지 갯수
// 나의 메시지를 제외한 다른 유저가 보낸 메시지의 갯수만 카운트
export async function getUnreadCount(userId: number, chatRoomId: string) {
  const count = await db.productMessage.count({
    where: {
      productChatRoomId: chatRoomId,
      isRead: false,
      userId: { not: userId }, // 내가 보낸 메시지 제외
    },
  });

  return count;
}
