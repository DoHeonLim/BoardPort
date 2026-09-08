/**
 * File Name : features/realtime/topics.ts
 * Description : BoardPort Supabase Realtime private 채널 topic 생성 규칙
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.21  임도헌   Created   사용자·상품 채팅·방송 채팅 topic 네임스페이스 분리
 */

const PRODUCT_CHAT_ROOM_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/** Realtime topic에 사용할 숫자 ID가 안전한 양의 정수인지 검증한다. */
function assertPositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }
}

/** 사용자 알림 private 채널 topic을 생성한다. */
export function notificationRealtimeTopic(userId: number) {
  assertPositiveInteger(userId, "userId");
  return `user:${userId}:notifications`;
}

/** 사용자 채팅방 목록 private 채널 topic을 생성한다. */
export function chatRoomsRealtimeTopic(userId: number) {
  assertPositiveInteger(userId, "userId");
  return `user:${userId}:chat-rooms`;
}

/** 상품 채팅방 ID를 검증하고 private 채널 topic을 생성한다. */
export function productChatRealtimeTopic(chatRoomId: string) {
  const normalizedId = chatRoomId.trim();
  if (
    !normalizedId ||
    normalizedId.length > 128 ||
    !PRODUCT_CHAT_ROOM_ID_PATTERN.test(normalizedId)
  ) {
    throw new Error("chatRoomId contains unsupported characters");
  }
  return `product-room:${normalizedId}`;
}

/** 방송 채팅방 private 채널 topic을 생성한다. */
export function streamChatRealtimeTopic(streamChatRoomId: number) {
  assertPositiveInteger(streamChatRoomId, "streamChatRoomId");
  return `stream-room:${streamChatRoomId}`;
}

export const LIVE_STATUS_REALTIME_TOPIC = "stream:status";
