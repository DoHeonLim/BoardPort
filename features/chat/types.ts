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
 * 2026.02.04  임도헌   Modified  채팅 이미지 전송을 위한 image 필드 추가
 * 2026.02.16  임도헌   Modified  Appointment 및 MessageType 추가
 * 2026.02.21  임도헌   Modified  ChatUser에 hasLeft 추가
 * 2026.03.12  임도헌   Modified  사용자 업로드 이미지의 애니메이션 메타 필드(imageAnimated, imageIsAnimated) 추가
 * 2026.03.07  임도헌   Modified  MessageReadPayload에 readerId 추가
 * 2026.03.07  임도헌   Modified  메시지 읽음 액션 결과 타입(MessageReadUpdateResult) 추가
 * 2026.03.14  임도헌   Modified  채팅방 목록에서 거래 상태를 표시할 수 있도록 ChatProduct에 예약/판매 완료 메타 추가
 * 2026.04.01  임도헌   Modified  채팅 메시지 삭제 상태와 실시간 삭제 payload 타입 추가
 * 2026.04.01  임도헌   Modified  채팅 메시지 반응 집계 타입(ChatMessageReactionSummary) 추가
 * 2026.04.02  임도헌   Modified  채팅 헤더 공용 제품 요약 타입(ChatHeaderProduct) 추가
 * 2026.04.03  임도헌   Modified  스트림 채팅 메시지 삭제 placeholder 지원용 deleted_at 필드 추가
 */

import type { AppointmentStatus, MessageType } from "@/generated/prisma/enums";
import type { ChatMessageReactionKey } from "@/features/chat/constants";

// =============================================================================
// 1. Entity / Model Types
// =============================================================================

/** 채팅 참여자 정보 (User Lite) */
export interface ChatUser {
  id: number;
  username: string;
  avatar?: string | null;
  hasLeft?: boolean;
}

/** 채팅방에 연결된 제품 정보 */
export interface ChatProduct {
  id: number;
  title: string;
  imageUrl: string;
  imageAnimated?: boolean;
  reservation_userId?: number | null;
  purchase_userId?: number | null;
}

/** 채팅 헤더/상세 래퍼에서 공유하는 제품 요약 정보 */
export type ChatHeaderProduct = {
  id: number;
  title: string;
  images: { url: string; isAnimated?: boolean }[];
  price: number;
  userId: number;
  reservation_userId: number | null;
  purchase_userId: number | null;
};

/** 개별 채팅 메시지 */
export interface ChatMessage {
  id: number;
  payload?: string | null;
  image?: string | null;
  imageIsAnimated?: boolean;
  deleted_at?: Date | null;
  reactions: ChatMessageReactionSummary[];
  type: MessageType;
  appointment?: Appointment | null;
  created_at: Date;
  isRead: boolean;
  user: ChatUser; // 보낸 사람
  productChatRoomId: string; // 연결된 채팅방 ID
}

/** 메시지 반응 집계 정보 */
export interface ChatMessageReactionSummary {
  key: ChatMessageReactionKey;
  count: number;
  userIds: number[];
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

/** 약속 정보 */
export interface Appointment {
  id: number;
  meetDate: Date;
  location: string;
  latitude: number;
  longitude: number;
  status: AppointmentStatus;
  proposerId: number;
  receiverId: number;
}

// =============================================================================
// 2. Realtime Payload Types
// =============================================================================

/**
 * 메시지 읽음 이벤트 Payload
 * - readIds: 읽음 처리된 메시지 ID 목록
 * - readerId: 실제 읽음 처리 요청을 수행한 사용자 ID
 */
export interface MessageReadPayload {
  readIds: number[];
  readerId: number;
}

/** 메시지 삭제 이벤트 Payload */
export interface MessageDeletedPayload {
  message: ChatMessage;
  wasUnread: boolean;
}

/** 메시지 읽음 처리 액션/서비스 결과 */
export type MessageReadUpdateResult =
  | { success: true; readIds: number[] }
  | { success: false; error: string };

// =============================================================================
// 3. Shared Stream Chat Types
// =============================================================================

/** 스트리밍 채팅 메시지 (Stream 도메인 공유) */
export interface StreamChatMessage {
  id: number;
  payload: string;
  deleted_at?: Date | null;
  created_at: Date;
  userId: number;
  user: {
    username: string;
    avatar: string | null;
  };
  streamChatRoomId: number;
}

