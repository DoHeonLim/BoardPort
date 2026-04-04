/**
 * File Name : features/notification/actions/list.ts
 * Description : 알림 목록 조회 및 읽음 처리 Server Actions
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   알림 목록 조회 및 읽음 처리 액션 구현
 * 2026.03.16  임도헌   Modified  서버 필터 쿼리를 전달하도록 알림 목록 조회 액션 확장
 * 2026.04.02  임도헌   Modified  알림 목록 응답 타입과 페이지 크기 상수를 공용 정의로 분리
 */

"use server";

import getSession from "@/lib/session";
import { revalidatePath } from "next/cache";
import type { ServiceResult } from "@/lib/types";
import { NOTIFICATION_PAGE_SIZE } from "@/features/notification/constants";
import { 
  getNotifications, 
  markNotificationAsRead,
  markAllNotificationsAsRead,
  normalizeNotificationFilter,
} from "@/features/notification/service/notification";
import type { NotificationListResponse } from "@/features/notification/types";

/**
 * 알림 목록 조회 Action
 *
 * [기능]
 * - 현재 로그인 사용자의 알림 목록을 페이지 단위로 조회
 * - 선택한 필터 쿼리를 서버 서비스에 전달
 */
export async function getNotificationsAction(
  page: number,
  filter?: string
): Promise<ServiceResult<NotificationListResponse>> {
  const session = await getSession();
  if (!session?.id) {
    return { success: false, error: "로그인이 필요합니다." };
  }
  return await getNotifications(
    session.id,
    page,
    NOTIFICATION_PAGE_SIZE,
    normalizeNotificationFilter(filter)
  );
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
