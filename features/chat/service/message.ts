/**
 * File Name : features/chat/service/message.ts
 * Description : 채팅 메시지 관리 (전송, 조회, 읽음 처리, 알림 연동)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.13  임도헌   Created   메시지 저장 및 실시간 브로드캐스트
 * 2025.11.10  임도헌   Modified  푸시 tag/renotify 적용(채팅방 단위 덮어쓰기)
 * 2025.12.02  임도헌   Modified  채팅방 권한 검증 추가, 알림/푸시 best-effort 처리, 아바타 URL 정리
 * 2025.12.03  임도헌   Modified  방해 금지 시간 정책 적용
 * 2025.12.21  임도헌   Modified  정책 적용 + sent>0일 때만 isPushSent/sentAt 갱신,
 *                                알림 이미지에 sender avatar 사용
 * 2026.01.02  임도헌   Modified  메시지 저장 직후 productChatRoom.updated_at 갱신 추가
 * 2026.01.03  임도헌   Modified  receiverId 반환 추가(채팅방 목록 per-user 캐시 정밀 무효화 지원)
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 * 2026.01.22  임도헌   Modified  lib/messages/* 통합 및 Controller 로직 이관, 주석 정리
 * 2026.01.28  임도헌   Modified  주석 보강
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { MESSAGE_LOAD_LIMIT } from "@/features/chat/constants";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { sendPushNotification } from "@/features/notification/service/sender";
import type { ServiceResult } from "@/lib/types";
import type { ChatMessage } from "@/features/chat/types";

/* -------------------------------------------------------------------------- */
/*                                 Read Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 초기 메시지 목록 조회
 * 최신 메시지부터 limit 개수만큼 조회 후, 시간 오름차순(과거->최신)으로 정렬하여 반환합니다.
 *
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} limit - 조회할 개수 (Default: 20)
 * @returns {Promise<ChatMessage[]>} 메시지 목록
 */
export const getInitialMessages = async (
  chatRoomId: string,
  limit = MESSAGE_LOAD_LIMIT
): Promise<ChatMessage[]> => {
  try {
    const messages = await db.productMessage.findMany({
      where: { productChatRoomId: chatRoomId },
      orderBy: { created_at: "desc" },
      take: limit,
      select: {
        id: true,
        payload: true,
        created_at: true,
        isRead: true,
        productChatRoomId: true,
        user: {
          select: { id: true, avatar: true, username: true },
        },
      },
    });

    return messages.reverse().map((m) => ({
      id: m.id,
      payload: m.payload,
      created_at: m.created_at,
      isRead: m.isRead,
      productChatRoomId: m.productChatRoomId ?? chatRoomId,
      user: {
        id: m.user.id,
        username: m.user.username,
        avatar: m.user.avatar,
      },
    }));
  } catch (err) {
    console.error("getInitialMessages error:", err);
    return [];
  }
};

/**
 * 과거 메시지 더 불러오기 (무한 스크롤)
 * lastMessageId(커서) 이전의 메시지를 limit 개수만큼 조회합니다.
 *
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} lastMessageId - 커서 (마지막으로 로드된 메시지 ID)
 * @param {number} limit - 조회할 개수
 * @returns {Promise<ServiceResult<ChatMessage[]>>}
 */
export async function getMoreMessages(
  chatRoomId: string,
  lastMessageId: number,
  limit = MESSAGE_LOAD_LIMIT
): Promise<ServiceResult<ChatMessage[]>> {
  try {
    const olderMessages = await db.productMessage.findMany({
      where: {
        productChatRoomId: chatRoomId,
        id: { lt: lastMessageId }, // 커서 기반 페이징
      },
      orderBy: { created_at: "desc" },
      take: limit,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    const data: ChatMessage[] = olderMessages.reverse().map((m) => ({
      id: m.id,
      payload: m.payload,
      created_at: m.created_at,
      isRead: m.isRead,
      productChatRoomId: m.productChatRoomId ?? chatRoomId,
      user: {
        id: m.user.id,
        username: m.user.username,
        avatar: m.user.avatar,
      },
    }));

    return { success: true, data };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "메시지 로드 중 오류 발생";
    return { success: false, error: message };
  }
}

/**
 * 읽지 않은 메시지 개수 조회 (특정 채팅방)
 */
export async function getUnreadCount(userId: number, chatRoomId: string) {
  return await db.productMessage.count({
    where: {
      productChatRoomId: chatRoomId,
      isRead: false,
      userId: { not: userId }, // 내가 보낸 메시지 제외
    },
  });
}

/* -------------------------------------------------------------------------- */
/*                                Write Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 메시지 전송
 *
 * [로직]
 * 1. 채팅방 권한 확인
 * 2. DB에 메시지 저장 및 채팅방 updated_at 갱신
 * 3. Supabase 실시간 채널로 메시지 브로드캐스트
 * 4. 수신자에게 알림(Notification) 생성 및 푸시 전송 (설정 확인 후)
 *
 * @param {string} payload - 메시지 내용
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} senderId - 보낸 사람 ID
 * @returns {Promise<ServiceResult<{ message: ChatMessage; receiverId?: number }>>}
 */
export async function createMessage(
  payload: string,
  chatRoomId: string,
  senderId: number
) {
  try {
    // 1. 방/권한 확인
    const room = await db.productChatRoom.findFirst({
      where: {
        id: chatRoomId,
        users: { some: { id: senderId } },
      },
      select: { id: true },
    });
    if (!room)
      return { success: false, error: "채팅방을 찾을 수 없거나 권한 없음" };

    // 2. 메시지 저장 & 방 갱신
    const message = await db.productMessage.create({
      data: { payload, userId: senderId, productChatRoomId: chatRoomId },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    await db.productChatRoom.update({
      where: { id: chatRoomId },
      data: { updated_at: new Date() }, // 목록 정렬을 위해 갱신
    });

    const chatMessage: ChatMessage = {
      id: message.id,
      payload: message.payload,
      created_at: message.created_at,
      isRead: message.isRead,
      productChatRoomId: chatRoomId,
      user: {
        id: message.user.id,
        username: message.user.username,
        avatar: message.user.avatar,
      },
    };

    // 3. 브로드캐스트 (실시간 전송)
    await supabase.channel(`room-${chatRoomId}`).send({
      type: "broadcast",
      event: "message",
      payload: chatMessage,
    });

    // 4. 알림 처리 (수신자 찾기)
    const receiver = await db.user.findFirst({
      where: {
        product_chat_rooms: { some: { id: chatRoomId } },
        NOT: { id: senderId },
      },
      select: { id: true, notification_preferences: true },
    });

    if (!receiver) return { success: true, data: { message: chatMessage } };

    const receiverId = receiver.id;
    const prefs = receiver.notification_preferences;

    // 알림 설정 확인
    if (!isNotificationTypeEnabled(prefs, "CHAT")) {
      return { success: true, data: { message: chatMessage, receiverId } };
    }

    const preview = payload.trim().slice(0, 20) + "...";
    const senderAvatarUrl = message.user.avatar
      ? `${message.user.avatar}/avatar`
      : undefined;

    // 5. 알림 DB 저장
    const notification = await db.notification.create({
      data: {
        userId: receiverId,
        title: "새 메시지",
        body: `${message.user.username}님이 메시지를 보냈습니다: ${preview}`,
        type: "CHAT",
        link: `/chats/${chatRoomId}`,
        image: senderAvatarUrl,
        isPushSent: false,
      },
    });

    // 6. 알림 전송 (In-app & Push) - Fire & Forget
    const tasks: Promise<any>[] = [];

    // In-app 알림
    tasks.push(
      supabase.channel(`user-${receiverId}-notifications`).send({
        type: "broadcast",
        event: "notification",
        payload: {
          userId: receiverId,
          title: notification.title,
          body: notification.body,
          link: notification.link,
          type: notification.type,
          image: notification.image,
        },
      })
    );

    // Push 알림
    if (canSendPushForType(prefs, "CHAT")) {
      tasks.push(
        sendPushNotification({
          targetUserId: receiverId,
          title: notification.title,
          message: notification.body,
          url: notification.link ?? undefined,
          type: "CHAT",
          image: senderAvatarUrl,
          tag: `bp-chat-${chatRoomId}`,
          renotify: true,
          topic: `bp-chat-${chatRoomId}`,
        }).then(async (res: any) => {
          if (res?.success && res.sent > 0) {
            await db.notification.update({
              where: { id: notification.id },
              data: { isPushSent: true, sentAt: new Date() },
            });
          }
        })
      );
    }

    await Promise.allSettled(tasks);

    return { success: true, data: { message: chatMessage, receiverId } };
  } catch (error) {
    console.error("createMessage Error:", error);
    return { success: false, error: "메시지 전송 실패" };
  }
}

/**
 * 메시지 읽음 처리
 *
 * [로직]
 * 1. 상대방이 보낸 읽지 않은 메시지를 DB에서 일괄 읽음 처리
 * 2. 실시간 채널로 읽음 상태 브로드캐스트
 * 3. 관련 Notification도 읽음 처리
 *
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} userId - 읽은 사람(나) ID
 */
export async function markMessagesAsRead(chatRoomId: string, userId: number) {
  // 1. 읽지 않은 메시지 조회 (상대방 메시지)
  const unreadIds = await db.$transaction(async (tx) => {
    const unread = await tx.productMessage.findMany({
      where: {
        productChatRoomId: chatRoomId,
        isRead: false,
        NOT: { userId },
      },
      select: { id: true },
    });

    if (unread.length === 0) return [];

    const ids = unread.map((m) => m.id);

    await tx.productMessage.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    });

    return ids;
  });

  if (unreadIds.length === 0) return { success: true, readIds: [] };

  // 2. 읽음 상태 Broadcast
  await supabase.channel(`room-${chatRoomId}`).send({
    type: "broadcast",
    event: "message_read",
    payload: { readIds: unreadIds },
  });

  // 3. 관련 Notification 읽음 처리
  await db.notification.updateMany({
    where: {
      userId,
      type: "CHAT",
      link: `/chats/${chatRoomId}`,
      isRead: false,
    },
    data: { isRead: true },
  });

  return { success: true, readIds: unreadIds };
}
