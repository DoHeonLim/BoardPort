/**
 * File Name : features/notification/actions/count.ts
 * Description : 안 읽은 알림 개수 조회 Server Action
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   초기 안 읽은 알림 개수 조회 액션 구현
 * 2026.05.16  임도헌   Modified  미읽음 알림 카운트 DB 조회를 service 계층으로 이동
 */

"use server";

import getSession from "@/lib/session";
import { getUnreadNotificationCountByUser } from "@/features/notification/service/notification";

/**
 * 현재 로그인한 유저의 읽지 않은 알림 개수를 조회
 *
 * @returns {Promise<number>} 안 읽은 알림 수 (비로그인 시 0)
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const session = await getSession();
  if (!session?.id) return 0;

  try {
    return await getUnreadNotificationCountByUser(session.id);
  } catch (error) {
    console.error("Failed to fetch unread notification count:", error);
    return 0;
  }
}
