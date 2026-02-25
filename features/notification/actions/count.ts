/**
 * File Name : features/notification/actions/count.ts
 * Description : 안 읽은 알림 개수 조회 Server Action
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.08  임도헌   Created   초기 안 읽은 알림 개수 조회 액션 구현
 */

"use server";

import db from "@/lib/db";
import getSession from "@/lib/session";

/**
 * 현재 로그인한 유저의 읽지 않은 알림 개수를 조회
 *
 * @returns {Promise<number>} 안 읽은 알림 수 (비로그인 시 0)
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const session = await getSession();
  if (!session?.id) return 0;

  try {
    const count = await db.notification.count({
      where: {
        userId: session.id,
        isRead: false,
      },
    });
    return count;
  } catch (error) {
    console.error("Failed to fetch unread notification count:", error);
    return 0;
  }
}
