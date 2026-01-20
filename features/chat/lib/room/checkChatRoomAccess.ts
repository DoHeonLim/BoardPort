/**
 * File Name : features/chat/lib/room/checkChatRoomAccess.ts
 * Description : 채팅방 및 접근 권한 확인 로직 (product 제외)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   채팅방 존재 및 접근 권한 확인
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */

import db from "@/lib/db";

/**
 * checkChatRoomAccess
 * - 채팅방 존재 여부 및 사용자의 접근 권한을 확인하는 유틸
 * - 접근 권한이 있는 경우 room 객체 반환, 없으면 null 반환
 *
 * chatRoomId - 확인할 채팅방 ID
 * userId - 요청한 사용자 ID
 * @returns 해당 사용자가 접근 가능한 채팅방 정보 또는 null
 */
export async function checkChatRoomAccess(chatRoomId: string, userId: number) {
  // 1. 채팅방 존재 여부 및 참여자/제품 정보 조회
  const room = await db.productChatRoom.findUnique({
    where: { id: chatRoomId },
    include: {
      users: {
        select: {
          id: true, // 참여자 ID만 가져옴
        },
      },
      product: {
        select: {
          id: true, // 제품 ID만 가져옴 (상세 정보는 이 함수에선 사용 X)
        },
      },
    },
  });

  // 2. 채팅방이 없으면 null 반환
  if (!room) return null;

  // 3. 현재 사용자가 이 채팅방의 참여자인지 확인
  const canSee = room.users.some((user) => user.id === userId);

  // 4. 접근 가능하면 room 반환, 아니면 null
  return canSee ? room : null;
}
