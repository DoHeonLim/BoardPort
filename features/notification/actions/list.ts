/**
 * File Name : features/notification/actions/list.ts
 * Description : 알림 목록 조회 및 읽음 처리 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   알림 목록 조회 및 읽음 처리 액션 구현
 */

"use server";

import getSession from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ServiceResult } from "@/lib/types";
import { 
  getNotifications, 
  markNotificationAsRead,
  markAllNotificationsAsRead,
  NotificationListResponse
} from "@/features/notification/service/notification"; // Import 추가

/**
 * 알림 목록 조회 Action
 */
export async function getNotificationsAction(
  page: number
): Promise<ServiceResult<NotificationListResponse>> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }
  return await getNotifications(session.id, page);
}

/**
 * 단일 알림 읽음 처리 Action
 */
export async function markNotificationAsReadAction(
  notificationId: number
): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }
  const result = await markNotificationAsRead(notificationId, session.id);
  if (result.success) {
    revalidatePath("/profile/notifications/list"); // 알림 목록 갱신
  }
  return result;
}

/**
 * 모든 알림 읽음 처리 Action
 */
export async function markAllNotificationsAsReadAction(): Promise<ServiceResult> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }
  const result = await markAllNotificationsAsRead(session.id);
  if (result.success) {
    revalidatePath("/profile/notifications/list"); // 알림 목록 갱신
  }
  return result;
}