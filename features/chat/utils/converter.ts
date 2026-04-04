/**
 * File Name : features/chat/utils/converter.ts
 * Description : 채팅 관련 DB 모델을 DTO로 변환하는 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.19  임도헌   Created   mapToChatMessage 공통화
 * 2026.03.12  임도헌   Modified  채팅 이미지 애니메이션 메타(imageIsAnimated) DTO 매핑 추가
 * 2026.04.01  임도헌   Modified  메시지 삭제 상태(deleted_at) DTO 매핑 추가
 * 2026.04.02  임도헌   Modified  컨버터 JSDoc 파라미터/반환 설명 보강
 */

import type { ChatMessage } from "@/features/chat/types";
import {
  CHAT_MESSAGE_REACTION_KEYS,
  type ChatMessageReactionKey,
} from "@/features/chat/constants";
import type { AppointmentStatus, MessageType } from "@/generated/prisma/client";

type AppointmentLike = {
  id: number;
  meetDate: Date;
  location: string;
  latitude: number;
  longitude: number;
  status: AppointmentStatus;
  proposerId: number;
  receiverId: number;
};

type ProductMessageReactionLike = {
  reactionKey: string;
  userId: number;
};

type ProductMessageLike = {
  id: number;
  payload: string | null;
  image: string | null;
  imageIsAnimated?: boolean | null;
  deleted_at?: Date | null;
  type: MessageType;
  created_at: Date;
  isRead: boolean;
  productChatRoomId: string | null;
  user: {
    id: number;
    username: string;
    avatar: string | null;
  };
  appointment?: AppointmentLike | null;
  reactions?: ProductMessageReactionLike[];
};

function buildReactionSummaries(
  reactions: Array<{ reactionKey: string; userId: number }> | undefined
) {
  if (!reactions || reactions.length === 0) {
    return [];
  }

  const grouped = new Map<
    ChatMessageReactionKey,
    { key: ChatMessageReactionKey; count: number; userIds: number[] }
  >();

  for (const reaction of reactions) {
    const key = reaction.reactionKey as ChatMessageReactionKey;
    const current =
      grouped.get(key) ?? {
        key,
        count: 0,
        userIds: [],
      };

    current.count += 1;
    current.userIds.push(reaction.userId);
    grouped.set(key, current);
  }

  return CHAT_MESSAGE_REACTION_KEYS.flatMap((key) => {
    const summary = grouped.get(key);
    return summary ? [summary] : [];
  });
}

/**
 * DB 메시지 객체(Prisma Payload)를 ChatMessage DTO로 변환
 * - 날짜 문자열(JSON)을 Date 객체로 보장
 * - 약속(Appointment) 정보가 있을 경우 함께 매핑
 *
 * @param {ProductMessageLike} m - Prisma include 결과를 닮은 메시지 객체
 * @returns {ChatMessage} 클라이언트에서 바로 사용할 수 있는 채팅 메시지 DTO
 */
export function mapToChatMessage(m: ProductMessageLike): ChatMessage {
  return {
    id: m.id,
    payload: m.payload,
    image: m.image,
    imageIsAnimated: m.imageIsAnimated ?? false,
    deleted_at: m.deleted_at ? new Date(m.deleted_at) : null,
    reactions: buildReactionSummaries(m.reactions),
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
    productChatRoomId: m.productChatRoomId ?? "",
    user: {
      id: m.user.id,
      username: m.user.username,
      avatar: m.user.avatar,
    },
  };
}

