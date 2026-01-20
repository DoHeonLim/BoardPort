/**
 * File Name : app/chats/[id]/actions/room
 * Description : 채팅방 관련 서버 액션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.21  임도헌   Created   app/chats/[id]/actions.ts 파일을 기능별로 분리
 * 2025.12.02  임도헌   Modified  채팅방 나가기 액션(leaveChatRoomAction) 추가
 * 2026.01.02  임도헌   Modified  chat-rooms 태그 무효화 추가(채팅방 목록 캐시 정합성)
 * 2026.01.03  임도헌   Modified  CHAT_ROOMS_ID(per-user) 정밀 무효화 적용(효율성 우선)
 */
"use server";

import { checkChatRoomAccess } from "@/features/chat/lib/room/checkChatRoomAccess";
import { getChatRoomDetails } from "@/features/chat/lib/room/getChatRoomDetails";
import { leaveChatRoom } from "@/features/chat/lib/room/leaveChatRoom";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";

/**
 * 채팅방 접근 권한 server action
 */
export const checkChatRoomAccessAction = async (
  chatRoomId: string,
  userId: number
) => {
  return await checkChatRoomAccess(chatRoomId, userId);
};

/**
 * 채팅방 제품 상세 정보 조회 server action
 */
export const getChatRoomDetailsAction = async (productId: number) => {
  return await getChatRoomDetails(productId);
};

/**
 * viewer를 제품 채팅방에서 제거하는 server action
 */
export const leaveChatRoomAction = async (chatRoomId: string) => {
  const result = await leaveChatRoom(chatRoomId);

  /**
   * 채팅방 나가기/삭제는 "내 채팅 리스트"에서 해당 방이 사라지거나,
   * 최신 메시지/정렬/미읽음 상태가 즉시 바뀌어야 하므로 목록 캐시를 무효화한다.
   *
   * - 효율성 우선: per-user 태그(CHAT_ROOMS_ID)를 먼저 무효화
   * - fallback: 전역 tag(CHAT_ROOMS)는 예외/복구 시나리오 대비로 유지
   */
  if (result?.success) {
    if ((result as any)?.userId) {
      revalidateTag(T.CHAT_ROOMS_ID((result as any).userId));
    }
    revalidateTag(T.CHAT_ROOMS());
  }

  return result;
};
