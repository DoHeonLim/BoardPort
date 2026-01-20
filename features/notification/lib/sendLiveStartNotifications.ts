/**
 * File Name : features/notification/lib/sendLiveStartNotifications.ts
 * Description : 방송 시작 시 팔로워에게 STREAM 알림 생성 + 웹 푸시 전송
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.03  임도헌   Created   방송 시작 알림 로직 분리(팔로워 + QuietHours + 푸시)
 * 2025.12.21  임도헌   Modified  pushEnabled는 푸시에만 영향,
 *                                푸시 성공 판정은 sent>0 기준, STREAM tag/renotify 명시
 * 2025.12.28  임도헌   Modified  realtime payload에 userId 포함(클라 NotificationListener 필터와 정합)
 * 2026.01.19  임도헌   Moved     lib/notification -> features/notification/lib
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/lib/policy";
import { sendPushNotification } from "@/features/notification/lib/push-notification";

type Params = {
  broadcasterId: number; // 방송하는 유저 id
  broadcastId: number; // Broadcast id
  broadcastTitle: string;
  broadcastThumbnail?: string | null;
};

export async function sendLiveStartNotifications({
  broadcasterId,
  broadcastId,
  broadcastTitle,
  broadcastThumbnail,
}: Params) {
  const broadcaster = await db.user.findUnique({
    where: { id: broadcasterId },
    select: { username: true },
  });
  const broadcasterName = broadcaster?.username ?? "팔로우한 선원";

  const follows = await db.follow.findMany({
    where: { followingId: broadcasterId },
    select: { followerId: true },
  });
  if (!follows.length) return { created: 0, pushed: 0 };

  const followerIds = follows.map((f) => f.followerId);

  const prefsList = await db.notificationPreferences.findMany({
    where: { userId: { in: followerIds } },
  });
  const prefMap = new Map<number, (typeof prefsList)[number]>();
  for (const p of prefsList) prefMap.set(p.userId, p);

  const title = "팔로우한 선원이 방송을 시작했어요";
  const body = `${broadcasterName} 님이 '${broadcastTitle}' 방송을 시작했습니다. 같이 보러 갈까요?`;
  const link = `/streams/${broadcastId}`;

  let created = 0;
  let pushed = 0;

  const now = new Date();

  for (const followerId of followerIds) {
    const pref = prefMap.get(followerId) ?? null;

    if (!isNotificationTypeEnabled(pref, "STREAM")) continue;

    const notification = await db.notification.create({
      data: {
        userId: followerId,
        title,
        body,
        image: broadcastThumbnail ?? null,
        type: "STREAM",
        link,
        isPushSent: false,
      },
    });
    created += 1;

    try {
      await supabase.channel(`user-${followerId}-notifications`).send({
        type: "broadcast",
        event: "notification",
        payload: {
          userId: followerId,
          id: notification.id,
          title: notification.title,
          body: notification.body,
          image: notification.image,
          type: notification.type,
          link: notification.link,
          created_at: notification.created_at,
        },
      });
    } catch (err) {
      console.warn(
        "[sendLiveStartNotifications] supabase notification broadcast failed:",
        err
      );
    }

    if (!canSendPushForType(pref, "STREAM", now)) {
      continue;
    }

    const result = await sendPushNotification({
      targetUserId: followerId,
      title,
      message: body,
      url: link,
      type: "STREAM",
      image: broadcastThumbnail ?? undefined,
      tag: `bp-stream-start-${broadcastId}`,
      renotify: true,
      topic: `bp-stream-start-${broadcastId}`,
    });

    if (result && result.success && (result as any).sent > 0) {
      pushed += 1;
      await db.notification.update({
        where: { id: notification.id },
        data: {
          isPushSent: true,
          sentAt: new Date(),
        },
      });
    }
  }

  return { created, pushed };
}
