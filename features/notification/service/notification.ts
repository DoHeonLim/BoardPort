/**
 * File Name : features/notification/service/notification.ts
 * Description : 알림 관련 비즈니스 로직 (조회, 읽음 처리, 발송)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   알림 목록 조회, 읽음 처리, 관리자 알림 발송 추가
 * 2026.02.12  임도헌   Modified  UNBAN_USER, CHANGE_ROLE 타입 추가 및 알림 생성 로직 보강
 */

import "server-only";
import db from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { sendPushNotification } from "@/features/notification/service/sender";
import {
  canSendPushForType,
  isNotificationTypeEnabled,
} from "@/features/notification/utils/policy";
import type { ServiceResult } from "@/lib/types";

// AdminActionNotification에서 사용하는 타입
export type AdminNotificationType =
  | "DELETE_PRODUCT"
  | "DELETE_POST"
  | "DELETE_STREAM"
  | "BAN_USER"
  | "UNBAN_USER"
  | "CHANGE_ROLE";

// 알림 목록 DTO
export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  image: string | null;
  type: string;
  link: string | null;
  isRead: boolean;
  created_at: Date;
}

export interface NotificationListResponse {
  items: NotificationItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

/**
 * 관리자 조치(삭제/정지) 시 대상 유저에게 알림을 발송
 * - DB 저장, 인앱 실시간 브로드캐스트, 웹 푸시를 포함
 */
export async function sendAdminActionNotification({
  targetUserId,
  type,
  title,
  reason,
}: {
  targetUserId: number;
  type: AdminNotificationType;
  title?: string;
  reason: string;
}) {
  try {
    let notiTitle = "알림";
    let notiBody = "";

    switch (type) {
      case "DELETE_PRODUCT":
        notiTitle = "상품이 삭제되었습니다";
        notiBody = `'${title}' 상품이 운영 정책 위반으로 삭제되었습니다.\n사유: ${reason}`;
        break;
      case "DELETE_POST":
        notiTitle = "게시글이 삭제되었습니다";
        notiBody = `'${title}' 게시글이 운영 정책 위반으로 삭제되었습니다.\n사유: ${reason}`;
        break;
      case "DELETE_STREAM":
        notiTitle = "방송이 강제 종료되었습니다";
        notiBody = `'${title}' 방송이 운영 정책 위반으로 종료되었습니다.\n사유: ${reason}`;
        break;
      case "BAN_USER":
        notiTitle = "서비스 이용이 정지되었습니다";
        notiBody = `운영 정책 위반으로 인해 서비스 이용이 제한되었습니다.\n사유: ${reason}`;
        break;
      case "UNBAN_USER":
        notiTitle = "이용 정지가 해제되었습니다";
        notiBody =
          "이제 보드포트의 모든 서비스를 정상적으로 이용하실 수 있습니다. 항해를 다시 시작해보세요! ⚓";
        break;
      case "CHANGE_ROLE":
        notiTitle = "계정 권한이 변경되었습니다";
        notiBody = `관리자에 의해 계정 권한이 '${title}'(으)로 변경되었습니다.`;
        break;
    }

    const pref = await db.notificationPreferences.findUnique({
      where: { userId: targetUserId },
    });

    if (!isNotificationTypeEnabled(pref, "SYSTEM")) return;

    // 1. DB 알림 레코드 생성 (이 부분이 핵심)
    const notification = await db.notification.create({
      data: {
        userId: targetUserId,
        title: notiTitle,
        body: notiBody,
        type: "SYSTEM",
        link: "/profile/notifications/list",
        isPushSent: false,
      },
    });

    // 2. 실시간 브로드캐스트
    await supabase.channel(`user-${targetUserId}-notifications`).send({
      type: "broadcast",
      event: "notification",
      payload: {
        id: notification.id,
        userId: targetUserId,
        title: notification.title,
        body: notification.body,
        link: notification.link,
        type: notification.type,
        created_at: notification.created_at,
      },
    });

    // 3. 웹 푸시 발송
    if (canSendPushForType(pref, "SYSTEM")) {
      const pushRes = await sendPushNotification({
        targetUserId,
        title: notiTitle,
        message: notiBody,
        url: "/profile/notifications/list",
        type: "SYSTEM",
      });

      if (pushRes.success && (pushRes.data?.sent ?? 0) > 0) {
        await db.notification.update({
          where: { id: notification.id },
          data: { isPushSent: true, sentAt: new Date() },
        });
      }
    }
  } catch (error) {
    console.error("[sendAdminActionNotification] Error:", error);
  }
}

/**
 * 알림 목록 조회
 * - 사용자가 받은 모든 알림을 최신순으로 조회
 */
export async function getNotifications(
  userId: number,
  page: number = 1,
  limit: number = 20
): Promise<ServiceResult<NotificationListResponse>> {
  try {
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      db.notification.count({ where: { userId } }),
      db.notification.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          body: true,
          image: true,
          type: true,
          link: true,
          isRead: true,
          created_at: true,
        },
        orderBy: { created_at: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      success: true,
      data: {
        items,
        total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  } catch (error) {
    console.error("[getNotifications] Error:", error);
    return { success: false, error: "알림 목록을 불러오지 못했습니다." };
  }
}

/**
 * 특정 알림을 읽음 처리
 */
export async function markNotificationAsRead(
  notificationId: number,
  userId: number
): Promise<ServiceResult> {
  try {
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
      select: { userId: true, isRead: true },
    });

    if (!notification)
      return { success: false, error: "알림을 찾을 수 없습니다." };
    if (notification.userId !== userId)
      return { success: false, error: "권한이 없습니다." };
    if (notification.isRead) return { success: true };

    await db.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("[markNotificationAsRead] Error:", error);
    return { success: false, error: "알림 읽음 처리 실패" };
  }
}

/**
 * 모든 알림을 읽음 처리
 */
export async function markAllNotificationsAsRead(
  userId: number
): Promise<ServiceResult> {
  try {
    await db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { success: true };
  } catch (error) {
    console.error("[markAllNotificationsAsRead] Error:", error);
    return { success: false, error: "모든 알림 읽음 처리 실패" };
  }
}
