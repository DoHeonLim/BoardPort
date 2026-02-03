/**
 * File Name : features/chat/actions/room.ts
 * Description : 채팅방 관리 Controller (나가기)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.21  임도헌   Created   app/chats/[id]/actions.ts 파일을 기능별로 분리
 * 2025.12.02  임도헌   Modified  채팅방 나가기 액션(leaveChatRoomAction) 추가
 * 2026.01.02  임도헌   Modified  chat-rooms 태그 무효화 추가(채팅방 목록 캐시 정합성)
 * 2026.01.03  임도헌   Modified  CHAT_ROOMS_ID(per-user) 정밀 무효화 적용(효율성 우선)
 * 2026.01.22  임도헌   Modified  Service Layer 통합 및 Session 주입, 불필요 Action 제거
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Moved     app/chats/[id]/actions/room.ts -> features/chat/actions/room.ts
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { leaveChatRoom } from "@/features/chat/service/room";

/**
 * 채팅방 나가기 Action
 * - 로그인 세션을 확인합니다.
 * - Service를 호출하여 사용자를 방에서 제거합니다.
 * - 성공 시 채팅방 목록 캐시를 무효화합니다.
 *
 * @param {string} chatRoomId - 채팅방 ID
 */
export const leaveChatRoomAction = async (chatRoomId: string) => {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const result = await leaveChatRoom(chatRoomId, session.id);

  if (result?.success) {
    if (result.data?.userId) {
      revalidateTag(T.CHAT_ROOMS_ID(result.data.userId));
    }
    revalidateTag(T.CHAT_ROOMS());
  }

  return result;
};
