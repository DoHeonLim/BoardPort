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
 * 2026.02.22  임도헌   Modified  방을 나갈 때 남아있는 상대방의 채팅 목록 캐시도 무효화
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import { leaveChatRoom } from "@/features/chat/service/room";

/**
 * 채팅방 나가기 Action
 *
 * - Service(`leaveChatRoom`)를 호출하여 유저 연결 해제, PENDING 약속 취소, 시스템 메시지 생성을 수행
 * - 나가는 본인의 채팅방 목록뿐만 아니라, 남아있는 상대방(`counterpartyId`)의 채팅방 목록 캐시도
 *   무효화하여 '대화 상대가 나갔습니다' 상태가 즉시 반영
 *
 * @param {string} chatRoomId - 채팅방 ID
 */
export const leaveChatRoomAction = async (chatRoomId: string) => {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const result = await leaveChatRoom(chatRoomId, session.id);

  if (result?.success && result.data) {
    // 내 캐시 갱신
    revalidateTag(T.CHAT_ROOMS_ID(result.data.userId));

    // 상대방 캐시 갱신 (상대방 목록에 '대화 상대가 나갔습니다'를 즉시 반영하기 위함)
    if (result.data.counterpartyId) {
      revalidateTag(T.CHAT_ROOMS_ID(result.data.counterpartyId));
    }

    revalidateTag(T.CHAT_ROOMS());
  }

  return result;
};
