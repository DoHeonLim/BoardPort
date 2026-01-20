/**
 * File Name : features/chat/lib/messages/createMessage.ts
 * Description : 채팅 메시지 저장 및 실시간 브로드캐스트/푸시알림 (tag/renotify 적용)
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
 */

import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/lib/policy";
import { sendPushNotification } from "@/features/notification/lib/push-notification";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";

export async function createMessage(
  payload: string,
  chatRoomId: string,
  senderId: number
) {
  try {
    // 0) 채팅방 존재/권한 검증
    const room = await db.productChatRoom.findFirst({
      where: {
        id: chatRoomId,
        users: { some: { id: senderId } },
      },
      select: { id: true },
    });

    if (!room) {
      return {
        success: false,
        error: "채팅방을 찾을 수 없거나 권한이 없습니다.",
      };
    }

    // 1) 메시지 저장
    const message = await db.productMessage.create({
      data: {
        payload,
        userId: senderId,
        productChatRoomId: chatRoomId,
      },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    });

    // 채팅방 목록 정렬/최신화(updated_at desc)를 위해 방 updated_at 갱신
    // getChatRooms가 productChatRoom.updated_at으로 정렬하므로,
    // 메시지 생성 시 방의 updated_at도 함께 갱신해줘야 "최근 대화"가 위로 올라온다.
    await db.productChatRoom.update({
      where: { id: chatRoomId },
      data: { updated_at: new Date() },
    });

    // 2) 실시간 브로드캐스트
    await supabase.channel(`room-${chatRoomId}`).send({
      type: "broadcast",
      event: "message",
      payload: {
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
      },
    });

    // 3) 수신자 찾기 (1:1: 나 제외)
    const receiver = await db.user.findFirst({
      where: {
        product_chat_rooms: { some: { id: chatRoomId } },
        NOT: { id: senderId },
      },
      select: {
        id: true,
        notification_preferences: true,
      },
    });

    /**
     * 채팅방은 항상 1:1이 아닐 수 있으므로(receiver가 없을 수 있음),
     * receiver가 없으면 메시지 저장/브로드캐스트까지만 성공으로 처리한다.
     *
     * 또한 상위(server action)에서 채팅방 목록 캐시를 정밀 무효화할 수 있도록,
     * receiver가 존재하는 경우 receiverId를 함께 반환한다.
     */
    if (!receiver) return { success: true, message };

    const receiverId = receiver.id;
    const prefs = receiver.notification_preferences;

    // CHAT 타입 OFF면 알림 row 자체 생성 X
    if (!isNotificationTypeEnabled(prefs, "CHAT")) {
      return { success: true, message, receiverId };
    }

    const plain = payload.replace(/\s+/g, " ").trim();
    const preview = plain.length > 20 ? `${plain.slice(0, 20)}...` : plain;

    const senderAvatarUrl = message.user.avatar
      ? `${message.user.avatar}/avatar`
      : undefined;

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

    const tasks: Promise<any>[] = [];

    // in-app realtime
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

    // push (quietHours 반영)
    if (canSendPushForType(prefs, "CHAT")) {
      tasks.push(
        (async () => {
          try {
            const result = await sendPushNotification({
              targetUserId: receiverId,
              title: notification.title,
              message: notification.body,
              url: notification.link ?? undefined,
              type: "CHAT",
              image: senderAvatarUrl,
              tag: `bp-chat-${chatRoomId}`,
              renotify: true,
              topic: `bp-chat-${chatRoomId}`,
            });

            const sent = (result as any)?.sent ?? 0;
            if (result?.success && sent > 0) {
              await db.notification.update({
                where: { id: notification.id },
                data: { isPushSent: true, sentAt: new Date() },
              });
            }
          } catch (err) {
            console.warn("[createMessage] push failed:", err);
          }
        })()
      );
    }

    await Promise.allSettled(tasks);

    return { success: true, message, receiverId };
  } catch (error) {
    console.error("createMessage 실패:", error);
    return { success: false, error: "메시지 전송에 실패했습니다." };
  }
}
