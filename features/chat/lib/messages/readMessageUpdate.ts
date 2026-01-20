/**
 * File Name : features/chat/lib/messages/update/readMessageUpdate.ts
 * Description : 채팅 메시지 읽음 처리 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   메시지 읽음 처리 로직 분리
 * 2025.07.29  임도헌   Modified  읽은 메시지 ID 목록 반환
 * 2026.01.03  임도헌   Modified  findMany+updateMany를 트랜잭션으로 묶어 경합/정합성 보강
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */

import db from "@/lib/db";

/**
 * readMessageUpdate
 * - 지정된 채팅방에서 "본인이 아닌 사용자가 보낸 안 읽은 메시지"를 읽음 처리
 * - 읽음 처리된 메시지의 ID 목록을 반환
 *
 * chatRoomId - 채팅방 ID
 * userId - 현재 사용자 ID
 * @returns number[] - 읽음 처리된 메시지 ID 배열
 */
export const readMessageUpdate = async (
  chatRoomId: string,
  userId: number
): Promise<number[]> => {
  return await db.$transaction(async (tx) => {
    // 1) 읽지 않은 메시지 id 조회 (상대방이 보낸 것만)
    const unread = await tx.productMessage.findMany({
      where: {
        productChatRoomId: chatRoomId,
        isRead: false,
        NOT: { userId },
      },
      select: { id: true },
    });

    if (unread.length === 0) return [];

    const ids = unread.map((m) => m.id);

    // 2) 읽음 처리
    await tx.productMessage.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    });

    return ids;
  });
};
