/**
 * File Name : features/chat/utils/converter.ts
 * Description : 채팅 관련 DB 모델을 DTO로 변환하는 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.19  임도헌   Created   mapToChatMessage 공통화
 */

import type { ChatMessage } from "@/features/chat/types";
import type { MessageType } from "@/generated/prisma/client";

/**
 * DB 메시지 객체(Prisma Payload)를 ChatMessage DTO로 변환
 * - 날짜 문자열(JSON)을 Date 객체로 보장
 * - 약속(Appointment) 정보가 있을 경우 함께 매핑
 */
export function mapToChatMessage(m: any): ChatMessage {
  if (!m) return null as any;

  return {
    id: m.id,
    payload: m.payload,
    image: m.image,
    type: m.type as MessageType,
    appointment: m.appointment
      ? {
          id: m.appointment.id,
          meetDate: new Date(m.appointment.meetDate), // 날짜 객체 보장
          location: m.appointment.location,
          latitude: m.appointment.latitude,
          longitude: m.appointment.longitude,
          status: m.appointment.status,
          proposerId: m.appointment.proposerId,
          receiverId: m.appointment.receiverId,
        }
      : null,
    created_at: new Date(m.created_at),
    isRead: m.isRead,
    productChatRoomId: m.productChatRoomId,
    user: {
      id: m.user.id,
      username: m.user.username,
      avatar: m.user.avatar,
    },
  };
}
