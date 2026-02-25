/**
 * File Name : features/chat/actions/messages.ts
 * Description : 채팅 메시지 관리 Controller (전송, 조회, 읽음)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.09  임도헌   Created
 * 2024.11.09  임도헌   Modified  채팅 메시지 저장 추가
 * 2024.11.21  임도헌   Modified  Chatroom을 productChatRoom으로 변경
 * 2024.12.12  임도헌   Modified  message모델을 productMessage로 변경
 * 2024.12.22  임도헌   Modified  채팅 메시지 웹 푸시 기능 추가
 * 2024.12.26  임도헌   Modified  채팅방 제품 정보 추가
 * 2025.01.12  임도헌   Modified  푸시 알림 시 채팅 유저 이미지 추가
 * 2025.04.18  임도헌   Modified  checkQuickResponseBadge함수를 서버 액션으로 처리
 * 2025.05.23  임도헌   Modified  카테고리 필드명 변경(name->kor_name)
 * 2025.05.26  임도헌   Modified  .tsx -> .ts로 변경
 * 2025.07.13  임도헌   Modified  비즈니스 로직과 server action 분리
 * 2025.07.21  임도헌   Modified  app/chats/[id]/actions.ts 파일을 기능별로 분리
 * 2025.07.29  임도헌   Modified  readMessageUpdateAction에 실시간 읽음 처리 추가
 * 2025.11.21  임도헌   Modified  캐싱 제거
 * 2026.01.02  임도헌   Modified  chat-rooms 태그 무효화 추가(채팅방 목록 캐시 정합성 대비)
 * 2026.01.03  임도헌   Modified  CHAT_ROOMS_ID(per-user) 정밀 무효화 + receiver 동기화
 * 2026.01.22  임도헌   Modified  Service Layer 통합 및 비즈니스 로직 이관
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.01.30  임도헌   Moved     app/chats/[id]/actions/messages.ts -> features/chat/actions/message.ts
 * 2026.02.04  임도헌   Modified  sendMessageAction에 이미지 URL 파라미터 추가
 */
"use server";

import getSession from "@/lib/session";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";
import {
  createMessage,
  getMoreMessages,
  markMessagesAsRead,
} from "@/features/chat/service/message";
import type { ServiceResult } from "@/lib/types";
import type { ChatMessage } from "@/features/chat/types";

/**
 * 메시지 전송 Action
 * - 로그인 세션을 확인
 * - Service를 호출하여 메시지를 저장하고 브로드캐스트
 * - 성공 시 채팅방 목록 캐시(전체 및 사용자별)를 무효화하여 최신 상태를 반영
 *
 * @param chatRoomId - 채팅방 ID
 * @param payload - 메시지 텍스트 (선택)
 * @param image - 이미지 URL (선택)
 */
export const sendMessageAction = async (
  chatRoomId: string,
  payload?: string | null,
  image?: string | null
) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const result = await createMessage(chatRoomId, session.id, payload, image);

  if (result?.success) {
    // 보낸 사람의 채팅방 목록 갱신
    revalidateTag(T.CHAT_ROOMS_ID(session.id));
    // 받는 사람의 채팅방 목록 갱신 (Service에서 receiverId 반환 시)
    if (result.data?.receiverId) {
      revalidateTag(T.CHAT_ROOMS_ID(result.data.receiverId));
    }
    // 전역 채팅방 목록 갱신 (Fallback)
    revalidateTag(T.CHAT_ROOMS());
  }
  return result;
};

/**
 * 과거 메시지 로드 Action (무한 스크롤)
 *
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} lastMessageId - 마지막 메시지 ID (커서)
 * @param {number} limit - 조회 개수
 */
export const getMoreMessagesAction = async (
  chatRoomId: string,
  lastMessageId: number,
  limit = 20
): Promise<ServiceResult<ChatMessage[]>> => {
  return await getMoreMessages(chatRoomId, lastMessageId, limit);
};

/**
 * 메시지 읽음 처리 Action
 * - 상대방 메시지를 읽음 상태로 변경하고, 이를 브로드캐스트
 * - 성공 시 채팅방 목록의 안 읽은 메시지 카운트를 갱신하기 위해 캐시를 무효화
 *
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} userId - 읽은 유저 ID
 */
export const readMessageUpdateAction = async (
  chatRoomId: string,
  userId: number
) => {
  const result = await markMessagesAsRead(chatRoomId, userId);

  if (result.success && result.readIds.length > 0) {
    revalidateTag(T.CHAT_ROOMS_ID(userId));
    revalidateTag(T.CHAT_ROOMS());
  }

  return result;
};
