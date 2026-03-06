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
 * 2026.03.03  임도헌   Modified  getMoreMessagesAction에서 cursor(null) 기반 초기 조회 로직 통합
 * 2026.03.04  임도헌   Modified  주석 최신화
 * 2026.03.05  임도헌   Modified  채팅방 목록 및 메시지 갱신용 `revalidateTag` 호출 제거, 단일 진실 공급원(SSOT)을 로컬 Query Cache로 전환
 * 2026.03.07  임도헌   Modified  메시지 조회/읽음 Server Action에 세션 및 채팅방 접근 권한 검증 추가
 */
"use server";

import getSession from "@/lib/session";
import {
  createMessage,
  getMoreMessages,
  markMessagesAsRead,
  getInitialMessages,
} from "@/features/chat/service/message";
import { checkChatRoomAccess } from "@/features/chat/service/room";
import type { ServiceResult } from "@/lib/types";
import type { ChatMessage, MessageReadUpdateResult } from "@/features/chat/types";

/**
 * 채팅 메시지 전송 Server Action
 *
 * [데이터 가공 및 캐시 제어 로직]
 * - 로그인 세션 검증 후 Service 레이어를 호출하여 메시지 텍스트 및 이미지 데이터 영속화
 * - 생성된 메시지의 웹소켓 브로드캐스트 및 알림(Push/In-App) 처리 위임
 *
 * @param {string} chatRoomId - 메시지를 전송할 채팅방 ID
 * @param {string | null} [payload] - 전송할 텍스트 내용
 * @param {string | null} [image] - 첨부 이미지 URL
 */
export const sendMessageAction = async (
  chatRoomId: string,
  payload?: string | null,
  image?: string | null
) => {
  const session = await getSession();
  if (!session?.id) throw new Error("로그인이 필요합니다.");

  const result = await createMessage(chatRoomId, session.id, payload, image);

  return result;
};

/**
 * 채팅방 메시지 무한 스크롤 및 초기 로드 Server Action
 *
 * [데이터 페칭 전략]
 * - 커서(`lastMessageId`) 값이 null일 경우 최신(초기) 메시지 목록 조회
 * - 커서 값이 존재할 경우 해당 커서 이전의 과거 메시지 페이징 조회
 *
 * @param {string} chatRoomId - 조회할 채팅방 ID
 * @param {number | null} lastMessageId - 페이징 커서 (마지막 메시지 ID)
 * @param {number} limit - 페이지당 로드할 메시지 수
 * @returns {Promise<ServiceResult<ChatMessage[]>>} 메시지 데이터 배열 반환
 */
export const getMoreMessagesAction = async (
  chatRoomId: string,
  lastMessageId: number | null,
  limit = 20
): Promise<ServiceResult<ChatMessage[]>> => {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  const room = await checkChatRoomAccess(chatRoomId, session.id);
  if (!room) {
    return { success: false, error: "채팅방 접근 권한이 없습니다." };
  }

  if (!lastMessageId) {
    const data = await getInitialMessages(chatRoomId, limit);
    return { success: true, data };
  }
  return await getMoreMessages(chatRoomId, lastMessageId, limit);
};

/**
 * 채팅 메시지 읽음 처리 Server Action
 *
 * [상태 제어 로직]
 * - 상대방의 메시지를 일괄 읽음(isRead: true) 상태로 업데이트
 * - 변경된 읽음 상태를 상대방 화면에 브로드캐스트 전송
 *
 * @param {string} chatRoomId - 대상 채팅방 ID
 * @param {number} userId - 메시지를 읽은 사용자 ID (본인)
 */
export const readMessageUpdateAction = async (
  chatRoomId: string,
  userId: number
): Promise<MessageReadUpdateResult> => {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }

  if (session.id !== userId) {
    return { success: false, error: "읽음 처리 권한이 없습니다." };
  }

  const room = await checkChatRoomAccess(chatRoomId, session.id);
  if (!room) {
    return { success: false, error: "채팅방 접근 권한이 없습니다." };
  }

  const result = await markMessagesAsRead(chatRoomId, session.id);

  return result;
};
