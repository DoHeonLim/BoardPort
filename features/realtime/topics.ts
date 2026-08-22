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

function assertPositiveInteger(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer`);
  }
}

export function notificationRealtimeTopic(userId: number) {
  assertPositiveInteger(userId, "userId");
  return `user:${userId}:notifications`;
}

export function chatRoomsRealtimeTopic(userId: number) {
  assertPositiveInteger(userId, "userId");
  return `user:${userId}:chat-rooms`;
}

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

export function streamChatRealtimeTopic(streamChatRoomId: number) {
  assertPositiveInteger(streamChatRoomId, "streamChatRoomId");
  return `stream-room:${streamChatRoomId}`;
}

export const LIVE_STATUS_REALTIME_TOPIC = "stream:status";
