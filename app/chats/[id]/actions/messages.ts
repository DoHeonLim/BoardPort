/**
 * File Name : app/chats/[id]/actions/messages
 * Description : 채팅 메시지 관련 서버 액션
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
 */
"use server";

import getSession from "@/lib/session";
import { getInitialMessages } from "@/features/chat/lib/messages/getInitialMessages";
import { getMoreMessages } from "@/features/chat/lib/messages/getMoreMessages";
import { createMessage } from "@/features/chat/lib/messages/createMessage";
import { readMessageUpdate } from "@/features/chat/lib/messages/readMessageUpdate";
import { supabase } from "@/lib/supabase";
import db from "@/lib/db";
import { revalidateTag } from "next/cache";
import * as T from "@/lib/cacheTags";

/**
 * 채팅 메시지 전송 server action
 */
export const sendMessageAction = async (
  chatRoomId: string,
  payload: string
) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const result = await createMessage(payload, chatRoomId, session.id);

  /**
   * 채팅방 목록 캐시 정합성
   * - 채팅 리스트는 viewer(userId) 단위로 캐시되므로 per-user 태그를 우선 무효화한다.
   * - receiverId를 알 수 있으면 상대방 채팅 리스트도 함께 무효화해 "즉시 반영"을 보장한다.
   * - 전역 tag(CHAT_ROOMS)는 예외/롤백 대비 fallback로만 유지한다.
   */
  if (result?.success) {
    revalidateTag(T.CHAT_ROOMS_ID(session.id));
    if ((result as any)?.receiverId) {
      revalidateTag(T.CHAT_ROOMS_ID((result as any).receiverId));
    }
    revalidateTag(T.CHAT_ROOMS());
  }

  return result;
};

/**
 * 초기 메시지 조회 server action
 */
export const getInitialMessagesAction = async (
  chatRoomId: string,
  limit = 20
) => {
  return await getInitialMessages(chatRoomId, limit);
};

/**
 * 과거 메시지 추가 로드 server action
 */
export const getMoreMessagesAction = async (
  chatRoomId: string,
  lastMessageId: number,
  limit = 20
) => {
  return await getMoreMessages(chatRoomId, lastMessageId, limit);
};

/**
 * 메시지 읽음 처리 server action
 */
export const readMessageUpdateAction = async (
  chatRoomId: string,
  userId: number
) => {
  // 1) 메시지 읽음 처리
  const readIds = await readMessageUpdate(chatRoomId, userId);

  // 2) 메시지 읽음 브로드캐스트 (클라이언트 읽음 표시용)
  if (readIds.length > 0) {
    await supabase.channel(`room-${chatRoomId}`).send({
      type: "broadcast",
      event: "message_read",
      payload: { readIds },
    });
  }

  // 3) CHAT 알림 읽음 처리 (해당 방 알림만)
  await db.notification.updateMany({
    where: {
      userId,
      type: "CHAT",
      link: `/chats/${chatRoomId}`,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  // 읽음 처리로 인해 채팅방 목록의 unreadCount/배지 등이 바뀔 수 있으므로 per-user 무효화
  revalidateTag(T.CHAT_ROOMS_ID(userId));
  revalidateTag(T.CHAT_ROOMS()); // fallback

  return { success: true, readIds };
};
