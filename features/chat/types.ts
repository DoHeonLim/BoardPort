/**
 * File Name : features/chat/types.ts
 * Description : 채팅 도메인 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   채팅 타입 분리
 * 2025.08.01  임도헌   Modified  스트리밍 채팅 메시지 타입 정의
 * 2025.11.21  임도헌   Modified  채팅방 unreadCount 필드 및 읽음 이벤트 payload 타입 정리
 */

// =============================================================================
// 1. Entity / Model Types
// =============================================================================

/** 채팅 참여자 정보 (User Lite) */
export interface ChatUser {
  id: number;
  username: string;
  avatar?: string | null;
}

/** 채팅방에 연결된 제품 정보 */
export interface ChatProduct {
  id: number;
  title: string;
  imageUrl: string;
}

/** 개별 채팅 메시지 */
export interface ChatMessage {
  id: number;
  payload: string;
  created_at: Date;
  isRead: boolean;
  user: ChatUser; // 보낸 사람
  productChatRoomId: string; // 연결된 채팅방 ID
}

/** 채팅방 정보 (목록용) */
export interface ChatRoom {
  id: string;
  created_at: Date;
  updated_at: Date;
  product: ChatProduct;
  users: ChatUser[];
  lastMessage: ChatMessage | null;
  unreadCount?: number; // 읽지 않은 메시지 수 (서버 주입)
}

/** 메시지 목록을 포함한 채팅방 (상세용 - Deprecated or Optional) */
export interface ChatRoomWithMessages extends ChatRoom {
  messages: ChatMessage[];
}

// =============================================================================
// 2. Realtime Payloads
// =============================================================================

/** 메시지 읽음 이벤트 Payload */
export interface MessageReadPayload {
  readIds: number[];
}

/** 스트리밍 채팅 메시지 (Stream 도메인 공유) */
export interface StreamChatMessage {
  id: number;
  payload: string;
  created_at: Date;
  userId: number;
  user: {
    username: string;
    avatar: string | null;
  };
  streamChatRoomId: number;
}
