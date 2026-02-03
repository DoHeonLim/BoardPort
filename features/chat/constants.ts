/**
 * File Name : features/chat/constants.ts
 * Description : 채팅 도메인 상수
 * Author : 임도헌
 *
 * History
 * 2026.01.24  임도헌   Created   상수 정의 (MESSAGE_LOAD_LIMIT 등)
 */

// 채팅 목록/메시지 페이징 단위
export const MESSAGE_LOAD_LIMIT = 20;

// Supabase Realtime 이벤트 이름
export const CHAT_EVENT = {
  MESSAGE: "message", // 새 메시지 수신
  MESSAGE_READ: "message_read", // 메시지 읽음 처리
} as const;
