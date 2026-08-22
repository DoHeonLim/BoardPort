/**
 * File Name : features/chat/service/message.ts
 * Description : 채팅 메시지 관리 (전송, 조회, 읽음, 삭제, 반응)
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
 * 2026.03.07  임도헌   Modified  읽음 브로드캐스트 payload에 readerId 추가
 * 2026.03.12  임도헌   Modified  채팅 이미지 저장 시 애니메이션 메타(imageIsAnimated) 함께 기록
 * 2026.03.13  임도헌   Modified  채팅방 미읽음 집계에서 SYSTEM 메시지를 제외해 시스템 안내가 unreadCount에 포함되지 않도록 조정
 * 2026.04.01  임도헌   Modified  본인 메시지를 삭제 상태로 전환하고 실시간 동기화하는 deleteMessage 로직 추가
 * 2026.04.02  임도헌   Modified  메시지 반응 추가/교체/해제와 실시간 동기화 로직 추가
 * 2026.04.03  임도헌   Modified  채팅방 조회 실패 문구를 찾을 수 없음과 권한 없음 문법으로 분리
 * 2026.04.04  임도헌   Modified  첫 메시지 전송 시 사용자 채널 rooms_refresh로 채팅방 목록 실시간 반영 지원
 * 2026.04.14  임도헌   Modified  채팅 목록 성능 점검 대응으로 메시지/읽음/삭제 변화마다 사용자 목록 refresh 브로드캐스트를 보강
 * 2026.06.17  임도헌   Modified  삭제된 채팅 메시지의 기존 알림 preview를 placeholder로 정리
 * 2026.06.21  임도헌   Modified  인앱 알림 더보기와 맞도록 새 메시지 알림 본문 사전 축약 제거
 * 2026.08.21  임도헌   Modified  사용자 목록·알림·상품 채팅 발신을 private topic으로 분리
 */

import "server-only";
import db from "@/lib/db";
import { realtimeServer as supabase } from "@/features/realtime/service/broadcast";
import {
  chatRoomsRealtimeTopic,
  notificationRealtimeTopic,
  productChatRealtimeTopic,
} from "@/features/realtime/topics";
import {
  CHAT_EVENT,
  CHAT_MESSAGE_REACTION_META,
  MESSAGE_LOAD_LIMIT,
} from "@/features/chat/constants";
import { MESSAGE_INCLUDE } from "@/features/chat/selects";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { sendPushNotification } from "@/features/notification/service/sender";
import { checkBlockRelation } from "@/features/user/service/block";
import { validateUserStatus } from "@/features/user/service/admin";
import { mapToChatMessage } from "@/features/chat/utils/converter";
import type { ServiceResult } from "@/lib/types";
import type {
  ChatMessage,
  MessageReadUpdateResult,
} from "@/features/chat/types";
import type { MessageType } from "@/generated/prisma/client";
import type { ChatMessageReactionKey } from "@/features/chat/constants";

/**
 * 사용자별 채팅방 목록을 다시 불러오게 하는 rooms_refresh 이벤트 브로드캐스트
 *
 * @param {number[]} userIds - 목록 재동기화가 필요한 사용자 ID 목록
 * @returns {Promise<void>} 브로드캐스트 완료 후 종료
 */
async function broadcastChatRoomListRefresh(userIds: number[]) {
  const uniqueUserIds = [...new Set(userIds.filter((id) => id > 0))];

  await Promise.allSettled(
    uniqueUserIds.map((targetUserId) =>
      supabase.channel(chatRoomsRealtimeTopic(targetUserId)).send({
        type: "broadcast",
        event: CHAT_EVENT.ROOMS_REFRESH,
        payload: { userId: targetUserId },
      })
    )
  );
}

/**
 * 특정 채팅방 참여자 전체에게 목록 refresh 이벤트를 전송
 *
 * @param {string} chatRoomId - 갱신 대상 채팅방 ID
 * @returns {Promise<void>} 참여자 조회 후 목록 refresh 브로드캐스트 완료
 */
async function broadcastChatRoomListRefreshByRoomId(chatRoomId: string) {
  const room = await db.productChatRoom.findUnique({
    where: { id: chatRoomId },
    select: {
      users: {
        select: { id: true },
      },
    },
  });

  if (!room) return;

  await broadcastChatRoomListRefresh(room.users.map((user) => user.id));
}

function buildChatNotificationBody({
  username,
  payload,
  image,
}: {
  username: string;
  payload: string | null;
  image: string | null;
}) {
  if (image && !payload) {
    return `${username}님이 사진을 보냈습니다.`;
  }

  const messageText = (payload ?? "").trim();

  if (!messageText) {
    return `${username}님이 메시지를 보냈습니다.`;
  }

  return `${username}님이 메시지를 보냈습니다: ${messageText}`;
}

async function redactDeletedMessageNotification({
  chatRoomId,
  senderId,
  senderName,
  payload,
  image,
  messageCreatedAt,
}: {
  chatRoomId: string;
  senderId: number;
  senderName: string;
  payload: string | null;
  image: string | null;
  messageCreatedAt: Date;
}) {
  try {
    const room = await db.productChatRoom.findUnique({
      where: { id: chatRoomId },
      select: {
        users: {
          where: { id: { not: senderId } },
          select: { id: true },
        },
      },
    });

    const receiverIds = room?.users.map((user) => user.id) ?? [];
    if (receiverIds.length === 0) return;

    const originalBody = buildChatNotificationBody({
      username: senderName,
      payload,
      image,
    });

    await db.notification.updateMany({
      where: {
        userId: { in: receiverIds },
        type: "CHAT",
        link: `/chats/${chatRoomId}`,
        body: originalBody,
        created_at: {
          gte: new Date(messageCreatedAt.getTime() - 5_000),
          lte: new Date(messageCreatedAt.getTime() + 2 * 60_000),
        },
      },
      data: {
        title: "삭제된 메시지",
        body: `${senderName}님이 보낸 메시지가 삭제되었습니다.`,
      },
    });
  } catch (error) {
    console.error("[redactDeletedMessageNotification] Error:", error);
  }
}

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
 *
 * @param {number} userId - 미읽음 집계를 조회하는 사용자 ID
 * @param {string} chatRoomId - 집계 대상 채팅방 ID
 * @returns {Promise<number>} 내가 받았지만 아직 읽지 않은 일반 메시지 개수
 */
export async function getUnreadCount(
  userId: number,
  chatRoomId: string
): Promise<number> {
  return await db.productMessage.count({
    where: {
      productChatRoomId: chatRoomId,
      isRead: false,
      deleted_at: null,
      type: { not: "SYSTEM" },
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
 * @param {boolean} [imageIsAnimated] - 이미지 GIF 여부
 * @returns {Promise<ServiceResult<{ message: ChatMessage; receiverId: number }>>} 처리 결과
 */
export async function createMessage(
  chatRoomId: string,
  senderId: number,
  payload?: string | null,
  image?: string | null,
  imageIsAnimated?: boolean
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
      return { success: false, error: "채팅방 접근 권한이 없습니다." };

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
        imageIsAnimated: image ? (imageIsAnimated ?? false) : false,
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
    await supabase.channel(productChatRealtimeTopic(chatRoomId)).send({
      type: "broadcast",
      event: CHAT_EVENT.MESSAGE,
      payload: chatMessage,
    });

    await broadcastChatRoomListRefresh([senderId, receiverId]);

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
        const bodyText = buildChatNotificationBody({
          username: message.user.username,
          payload: payload ?? null,
          image: image ?? null,
        });

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
        const tasks: Promise<unknown>[] = [];

        tasks.push(
          supabase.channel(notificationRealtimeTopic(receiverId)).send({
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
 * @returns {Promise<MessageReadUpdateResult>} 읽음 처리된 메시지 ID 목록 또는 실패 정보
 */
export async function markMessagesAsRead(
  chatRoomId: string,
  userId: number
): Promise<MessageReadUpdateResult> {
  // 1. 읽지 않은 메시지 조회 (상대방 메시지)
  const unreadIds = await db.$transaction(async (tx) => {
    const unread = await tx.productMessage.findMany({
      where: {
        productChatRoomId: chatRoomId,
        isRead: false,
        deleted_at: null,
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
  await supabase.channel(productChatRealtimeTopic(chatRoomId)).send({
    type: "broadcast",
    event: CHAT_EVENT.MESSAGE_READ,
    payload: { readIds: unreadIds, readerId: userId },
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

  await broadcastChatRoomListRefreshByRoomId(chatRoomId);

  return { success: true, readIds: unreadIds };
}

/**
 * 본인 채팅 메시지를 삭제 상태로 전환
 *
 * [정책]
 * - TEXT / IMAGE 메시지만 삭제 가능
 * - 행(row)은 유지하고 payload/image를 비워 타임라인 문맥을 보존
 * - 삭제된 메시지는 실시간 이벤트로 같은 채팅방 참여자에게 즉시 반영
 *
 * @param {number} messageId - 삭제할 메시지 ID
 * @param {number} userId - 삭제 요청 사용자 ID
 * @returns {Promise<ServiceResult<ChatMessage>>} 삭제 상태로 전환된 메시지 또는 실패 정보
 */
export async function deleteMessage(
  messageId: number,
  userId: number
): Promise<ServiceResult<ChatMessage>> {
  try {
    const existing = await db.productMessage.findUnique({
      where: { id: messageId },
      include: MESSAGE_INCLUDE,
    });

    if (!existing) {
      return { success: false, error: "메시지를 찾을 수 없습니다." };
    }

    if (existing.userId !== userId) {
      return { success: false, error: "본인 메시지만 삭제할 수 있습니다." };
    }

    if (existing.type === "SYSTEM" || existing.type === "APPOINTMENT") {
      return {
        success: false,
        error: "해당 메시지는 삭제할 수 없습니다.",
      };
    }

    if (existing.deleted_at) {
      return { success: true, data: mapToChatMessage(existing) };
    }

    const roomId = existing.productChatRoomId;
    if (!roomId) {
      return { success: false, error: "채팅방을 찾을 수 없습니다." };
    }

    const deletedMessage = await db.productMessage.update({
      where: { id: messageId },
      data: {
        payload: null,
        image: null,
        imageIsAnimated: false,
        deleted_at: new Date(),
        reactions: {
          deleteMany: {},
        },
      },
      include: MESSAGE_INCLUDE,
    });

    const chatMessage = mapToChatMessage(deletedMessage);
    const wasUnread = !existing.isRead;

    await redactDeletedMessageNotification({
      chatRoomId: roomId,
      senderId: userId,
      senderName: existing.user.username,
      payload: existing.payload,
      image: existing.image,
      messageCreatedAt: existing.created_at,
    });

    await supabase.channel(productChatRealtimeTopic(roomId)).send({
      type: "broadcast",
      event: CHAT_EVENT.MESSAGE_DELETED,
      payload: {
        message: chatMessage,
        wasUnread,
      },
    });

    await broadcastChatRoomListRefreshByRoomId(roomId);

    return { success: true, data: chatMessage };
  } catch (error) {
    console.error("deleteMessage Error:", error);
    return { success: false, error: "메시지 삭제에 실패했습니다." };
  }
}

/**
 * 채팅 메시지 반응 토글
 *
 * [정책]
 * - 한 사용자는 메시지당 반응 1개만 유지
 * - 같은 반응을 다시 누르면 해제
 * - 다른 반응을 누르면 교체
 * - 삭제/시스템/약속 메시지는 반응 불가
 *
 * @param {number} messageId - 반응을 변경할 메시지 ID
 * @param {number} userId - 반응 요청 사용자 ID
 * @param {ChatMessageReactionKey} reactionKey - 선택한 반응 키
 * @returns {Promise<ServiceResult<ChatMessage>>} 반응이 반영된 최신 메시지 또는 실패 정보
 */
export async function toggleMessageReaction(
  messageId: number,
  userId: number,
  reactionKey: ChatMessageReactionKey
): Promise<ServiceResult<ChatMessage>> {
  try {
    if (!(reactionKey in CHAT_MESSAGE_REACTION_META)) {
      return { success: false, error: "지원하지 않는 반응입니다." };
    }

    const existing = await db.productMessage.findUnique({
      where: { id: messageId },
      include: MESSAGE_INCLUDE,
    });

    if (!existing || !existing.productChatRoomId) {
      return { success: false, error: "메시지를 찾을 수 없습니다." };
    }

    const room = await db.productChatRoom.findFirst({
      where: {
        id: existing.productChatRoomId,
        users: { some: { id: userId } },
      },
      select: { id: true },
    });

    if (!room) {
      return { success: false, error: "채팅방 접근 권한이 없습니다." };
    }

    if (
      existing.deleted_at ||
      existing.type === "SYSTEM" ||
      existing.type === "APPOINTMENT"
    ) {
      return {
        success: false,
        error: "해당 메시지에는 반응을 남길 수 없습니다.",
      };
    }

    const currentReaction = existing.reactions.find(
      (reaction) => reaction.userId === userId
    );

    if (currentReaction?.reactionKey === reactionKey) {
      await db.productMessageReaction.delete({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
      });
    } else if (currentReaction) {
      await db.productMessageReaction.update({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
        data: { reactionKey },
      });
    } else {
      await db.productMessageReaction.create({
        data: {
          messageId,
          userId,
          reactionKey,
        },
      });
    }

    const updatedMessage = await db.productMessage.findUnique({
      where: { id: messageId },
      include: MESSAGE_INCLUDE,
    });

    if (!updatedMessage) {
      return { success: false, error: "메시지를 찾을 수 없습니다." };
    }

    const chatMessage = mapToChatMessage(updatedMessage);

    await supabase
      .channel(productChatRealtimeTopic(existing.productChatRoomId))
      .send({
        type: "broadcast",
        event: CHAT_EVENT.MESSAGE_REACTION,
        payload: chatMessage,
      });

    await broadcastChatRoomListRefreshByRoomId(existing.productChatRoomId);

    return { success: true, data: chatMessage };
  } catch (error) {
    console.error("toggleMessageReaction Error:", error);
    return { success: false, error: "메시지 반응 처리에 실패했습니다." };
  }
}
