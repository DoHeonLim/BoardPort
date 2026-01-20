/**
 * File Name : features/chat/lib/room/leaveChatRoom.ts
 * Description : viewer를 제품 채팅방에서 제거하는 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.02  임도헌   Created   채팅방 나가기 로직 추가
 * 2026.01.03  임도헌   Modified  성공 시 viewerId(userId) 반환 추가(채팅 목록 per-user 캐시 무효화 지원)
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */

import db from "@/lib/db";
import getSession from "@/lib/session";

/**
 * viewer(현재 로그인 유저)를 제품 채팅방에서 제거한다.
 * - 방에 속해있지 않으면 에러 반환
 * - viewer가 마지막 유저라면 방 자체를 삭제 (메시지는 onDelete: Cascade로 함께 정리)
 *
 * Return
 * - success: true 인 경우 userId(viewerId)를 함께 반환하여,
 *   상위(server action)에서 CHAT_ROOMS_ID(userId) 같은 per-user 태그를 정밀 무효화할 수 있게 한다.
 */
export async function leaveChatRoom(chatRoomId: string) {
  try {
    const session = await getSession();
    if (!session?.id) {
      return { success: false, error: "로그인이 필요합니다." };
    }

    const userId = session.id;

    // 방 + 현재 구성원 조회(권한)
    const room = await db.productChatRoom.findUnique({
      where: { id: chatRoomId },
      select: {
        id: true,
        users: { select: { id: true } },
      },
    });

    if (!room) {
      return { success: false, error: "채팅방을 찾을 수 없습니다." };
    }

    const isMember = room.users.some((u) => u.id === userId);
    if (!isMember) {
      return { success: false, error: "이미 이 채팅방에 속해있지 않습니다." };
    }

    // viewer 제외 후 남는 인원 수
    const remainingCount = room.users.length - 1;

    // 1) 우선 viewer를 방에서 제거
    await db.productChatRoom.update({
      where: { id: chatRoomId },
      data: {
        users: {
          disconnect: { id: userId },
        },
      },
    });

    // 2) 더 이상 참여자가 없다면 방 자체 삭제 (메시지는 onDelete: Cascade)
    if (remainingCount <= 0) {
      await db.productChatRoom.delete({
        where: { id: chatRoomId },
      });
    }

    return { success: true, userId };
  } catch (error) {
    console.error("leaveChatRoomAction error:", error);
    return {
      success: false,
      error: "채팅방 나가기 중 문제가 발생했습니다.",
    };
  }
}
