/**
 * File Name : features/notification/service/live.ts
 * Description : 방송 시작 알림 전파 (DB + Realtime + Push)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.03  임도헌   Created   방송 시작 알림 로직 분리(팔로워 + QuietHours + 푸시)
 * 2025.12.21  임도헌   Modified  pushEnabled는 푸시에만 영향,
 *                                푸시 성공 판정은 sent>0 기준, STREAM tag/renotify 명시
 * 2025.12.28  임도헌   Modified  realtime payload에 userId 포함(클라 NotificationListener 필터와 정합)
 * 2026.01.19  임도헌   Moved     lib/notification -> features/notification/lib
 * 2026.01.23  임도헌   Modified  lib/sendLiveStartNotifications -> service/live 이동 및 경로 수정
 * 2026.03.07  임도헌   Modified  push 전송 조건 분기 수정(canSendPushForType 부정 조건 제거)
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import { sendPushNotification } from "@/features/notification/service/sender";

type Params = {
  broadcasterId: number; // 방송하는 유저 id
  broadcastId: number; // Broadcast id
  broadcastTitle: string;
  broadcastThumbnail?: string | null;
};

/**
 * 팔로워들에게 방송 시작 알림을 전송
 * - 알림 설정(ON/OFF) 및 방해 금지 시간을 체크
 * - DB 알림 생성, In-App 브로드캐스트, 웹 푸시를 병렬로 처리
 *
 * @param params - 방송 정보 및 스트리머 ID
 * @returns 생성된 알림 및 발송된 푸시 개수
 */
export async function sendLiveStartNotifications({
  broadcasterId,
  broadcastId,
  broadcastTitle,
  broadcastThumbnail,
}: Params) {
  // 1. 방송자 정보 조회
  const broadcaster = await db.user.findUnique({
    where: { id: broadcasterId },
    select: { username: true },
  });
  const broadcasterName = broadcaster?.username ?? "팔로우한 선원";

  // 2. 팔로워 목록 조회 (알림 수신 대상)
  const follows = await db.follow.findMany({
    where: { followingId: broadcasterId },
    select: { followerId: true },
  });
  if (!follows.length) return { created: 0, pushed: 0 };

  const followerIds = follows.map((f) => f.followerId);

  // 3. 팔로워들의 알림 설정(Preferences) 조회 (Batch)
  const prefsList = await db.notificationPreferences.findMany({
    where: { userId: { in: followerIds } },
  });
  const prefMap = new Map<number, (typeof prefsList)[number]>();
  for (const p of prefsList) prefMap.set(p.userId, p);

  // 알림 내용 구성
  const title = "팔로우한 선원이 방송을 시작했어요";
  const body = `${broadcasterName} 님이 '${broadcastTitle}' 방송을 시작했습니다. 같이 보러 갈까요?`;
  const link = `/streams/${broadcastId}`;
  const imageUrl = broadcastThumbnail
    ? `${broadcastThumbnail}/public`
    : undefined;

  let created = 0;
  let pushed = 0;

  const now = new Date();

  // 4. 각 팔로워에 대해 알림 생성 및 전송 (순차 처리)
  // NOTE: 팔로워가 매우 많을 경우(수천 명 이상) 큐(Queue) 시스템 도입 필요
  for (const followerId of followerIds) {
    const pref = prefMap.get(followerId) ?? null;

    // 4-1. 앱 내 알림 생성 허용 여부 체크 (STREAM 타입)
    if (!isNotificationTypeEnabled(pref, "STREAM")) continue;

    // 4-2. DB 알림 생성
    const notification = await db.notification.create({
      data: {
        userId: followerId,
        title,
        body,
        image: imageUrl,
        type: "STREAM",
        link,
        isPushSent: false,
      },
    });
    created += 1;

    // 4-3. In-App Realtime 알림 전송 (접속 중인 경우 토스트 표시)
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
      console.warn("[live-noti] broadcast failed:", err);
    }

    // 4-4. Push 알림 전송 가능 여부 체크 (방해 금지 시간 등)
    if (canSendPushForType(pref, "STREAM", now)) {
      // 4-5. Web Push 발송 (비동기)
      // tag를 사용하여 동일 방송 알림이 중복 쌓이지 않고 갱신되도록 함
      const result = await sendPushNotification({
        targetUserId: followerId,
        title,
        message: body,
        url: link,
        type: "STREAM",
        image: imageUrl,
        tag: `bp-stream-start-${broadcastId}`,
        renotify: true,
      });
      // 4-6. 발송 성공 시 DB 업데이트 (통계용)
      if (result && result.success && (result.data?.sent ?? 0) > 0) {
        pushed += 1;
        await db.notification.update({
          where: { id: notification.id },
          data: { isPushSent: true, sentAt: new Date() },
        });
      }
    }
  }

  return { created, pushed };
}
