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
 * 2026.02.04  임도헌   Modified  메시지 생성 시 image 필드 추가 및 실시간 페이로드 확장
 * 2026.02.04  임도헌   Modified  메시지 생성 시 차단 관계 확인 로직 추가 및 변수명 충돌 해결
 * 2026.02.04  임도헌   Modified  receiverId를 활용한 알림 전송 로직 최적화
 * 2026.02.19  임도헌   Modified  공통 converter 적용 및 약속(Appointment) 정보 포함
 * 2026.02.21  임도헌   Modified  수신자 이탈 여부 추가
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { MESSAGE_INCLUDE, MESSAGE_LOAD_LIMIT } from "@/features/chat/constants";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { sendPushNotification } from "@/features/notification/service/sender";
import { checkBlockRelation } from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";
import { mapToChatMessage } from "@/features/chat/utils/converter";
import type { ServiceResult } from "@/lib/types";
import type { ChatMessage } from "@/features/chat/types";
import type { MessageType } from "@/generated/prisma/client";

/* -------------------------------------------------------------------------- */
/*                                 Read Logic                                 */
/* -------------------------------------------------------------------------- */

/**
 * 초기 메시지 목록 조회
 * 최신 메시지부터 limit 개수만큼 조회 후, 시간 오름차순(과거->최신)으로 정렬하여 반환
 *
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} limit - 조회할 개수 (Default: 20)
 * @returns {Promise<ChatMessage[]>} 메시지 목록
 */
export const getInitialMessages = async (
  chatRoomId: string,
  limit: number = MESSAGE_LOAD_LIMIT
): Promise<ChatMessage[]> => {
  try {
    const messages = await db.productMessage.findMany({
      where: { productChatRoomId: chatRoomId },
      orderBy: { created_at: "desc" },
      take: limit,
      include: MESSAGE_INCLUDE,
    });

    return messages.reverse().map(mapToChatMessage);
  } catch (err) {
    console.error("getInitialMessages error:", err);
    return [];
  }
};

/**
 * 과거 메시지 더 불러오기 (무한 스크롤)
 * lastMessageId(커서) 이전의 메시지를 limit 개수만큼 조회
 *
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} lastMessageId - 커서 (마지막으로 로드된 메시지 ID)
 * @param {number} limit - 조회할 개수
 * @returns {Promise<ServiceResult<ChatMessage[]>>}
 */
export async function getMoreMessages(
  chatRoomId: string,
  lastMessageId: number,
  limit: number = MESSAGE_LOAD_LIMIT
): Promise<ServiceResult<ChatMessage[]>> {
  try {
    const olderMessages = await db.productMessage.findMany({
      where: {
        productChatRoomId: chatRoomId,
        id: { lt: lastMessageId },
      },
      orderBy: { created_at: "desc" },
      take: limit,
      include: MESSAGE_INCLUDE,
    });

    const data = olderMessages.reverse().map(mapToChatMessage);
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
 * 메시지 전송 (텍스트 + 이미지)
 *
 * [비즈니스 로직]
 * 1. 정지 유저인지 체크
 * 2. 채팅방 접근 권한을 확인하고 수신자(상대방)의 ID를 식별
 * 3. 상대방과의 차단 관계(Block Check)를 확인하여 차단 상태면 메시지 전송을 차단
 * 4. DB에 메시지(payload, image)를 저장하고 채팅방의 `updated_at`을 현재 시간으로 갱신
 * 5. Supabase 실시간 채널을 통해 해당 방의 모든 참여자에게 메시지를 브로드캐스트
 * 6. 수신자의 알림 설정 및 방해 금지 시간을 확인하여 앱 내 알림 및 웹 푸시를 전송
 *
 * @param {string} chatRoomId - 채팅방 ID
 * @param {number} senderId - 보낸 사람 ID
 * @param {string | null} [payload] - 텍스트 내용
 * @param {string | null} [image] - 이미지 URL
 * @returns {Promise<ServiceResult<{ message: ChatMessage; receiverId: number }>>} 처리 결과
 */
export async function createMessage(
  chatRoomId: string,
  senderId: number,
  payload?: string | null,
  image?: string | null
): Promise<ServiceResult<{ message: ChatMessage; receiverId: number }>> {
  try {
    // 1. 발신자 정지 유저 체크
    const status = await validateUserStatus(senderId);
    if (!status.success) return status;

    // 2. 방/권한 확인 및 수신자 ID 조회
    const room = await db.productChatRoom.findFirst({
      where: {
        id: chatRoomId,
        users: { some: { id: senderId } },
      },
      select: {
        id: true,
        users: {
          where: { id: { not: senderId } }, // 나를 제외한 참여자 (상대방)
          select: { id: true, bannedAt: true },
          take: 1,
        },
      },
    });

    if (!room)
      return { success: false, error: "채팅방을 찾을 수 없거나 권한 없음" };

    const receiver = room.users[0];
    if (!receiver)
      return { success: false, error: "대화 상대가 채팅방을 나갔습니다." };

    // 수신자 정지 유저 체크
    if (receiver.bannedAt) {
      return {
        success: false,
        error: "운영 정책 위반으로 이용이 정지된 사용자입니다.",
      };
    }

    const receiverId = receiver.id;

    // 3. 차단 체크
    const isBlocked = await checkBlockRelation(senderId, receiverId);
    if (isBlocked) {
      return {
        success: false,
        error: "차단된 사용자에게는 메시지를 보낼 수 없습니다.",
      };
    }

    let msgType: MessageType = "TEXT";
    if (image) msgType = "IMAGE";

    // 4. 메시지 저장 & 방 갱신
    const message = await db.productMessage.create({
      data: {
        payload,
        image,
        type: msgType,
        userId: senderId,
        productChatRoomId: chatRoomId,
      },
      include: MESSAGE_INCLUDE,
    });

    await db.productChatRoom.update({
      where: { id: chatRoomId },
      data: { updated_at: new Date() },
    });

    const chatMessage = mapToChatMessage(message);

    // 5. 브로드캐스트 (실시간 전송)
    await supabase.channel(`room-${chatRoomId}`).send({
      type: "broadcast",
      event: "message",
      payload: chatMessage,
    });

    // 6. 알림 처리 (수신자 설정 조회)
    // receiverId가 존재하면 알림 로직 수행 (이미 위에서 찾았으므로 재사용)
    if (receiverId) {
      const receiverData = await db.user.findUnique({
        where: { id: receiverId },
        select: { notification_preferences: true },
      });

      const prefs = receiverData?.notification_preferences;

      // 알림 전송 조건 체크
      if (isNotificationTypeEnabled(prefs, "CHAT")) {
        // 알림 메시지 구성
        let bodyText = "";
        if (image && !payload) {
          bodyText = `${message.user.username}님이 사진을 보냈습니다.`;
        } else {
          const preview = (payload ?? "").trim().slice(0, 20) + "...";
          bodyText = `${message.user.username}님이 메시지를 보냈습니다: ${preview}`;
        }

        const senderAvatarUrl = message.user.avatar
          ? `${message.user.avatar}/avatar`
          : undefined;

        // 알림 DB 저장
        const notification = await db.notification.create({
          data: {
            userId: receiverId,
            title: "새 메시지",
            body: bodyText,
            type: "CHAT",
            link: `/chats/${chatRoomId}`,
            image: senderAvatarUrl,
            isPushSent: false,
          },
        });

        // 알림 전송 (In-app & Push) - Fire & Forget
        const tasks: Promise<any>[] = [];

        tasks.push(
          supabase.channel(`user-${receiverId}-notifications`).send({
            type: "broadcast",
            event: "notification",
            payload: {
              id: notification.id,
              userId: receiverId,
              title: notification.title,
              body: notification.body,
              link: notification.link,
              type: notification.type,
              image: notification.image,
              created_at: notification.created_at,
            },
          })
        );

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
            }).then(async (res) => {
              if (res?.success && res.data && res.data.sent > 0) {
                await db.notification.update({
                  where: { id: notification.id },
                  data: { isPushSent: true, sentAt: new Date() },
                });
              }
            })
          );
        }

        await Promise.allSettled(tasks);
      }
    }

    return {
      success: true,
      data: { message: chatMessage, receiverId },
    };
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
