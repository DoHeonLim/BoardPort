/**
 * File Name : features/notification/service/preference.ts
 * Description : 알림 설정(Preferences) DB 관리 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.23  임도헌   Created   NotificationPreferences 로직 분리
 */

import "server-only";
import db from "@/lib/db";

export type UpdatePreferencesDTO = {
  chat: boolean;
  trade: boolean;
  review: boolean;
  badge: boolean;
  stream: boolean;
  system: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

/**
 * 알림 설정 업데이트 (Upsert)
 * - pushEnabled는 여기서 변경하지 않음 (Subscription 로직에서 관리)
 *
 * @param userId - 유저 ID
 * @param data - 업데이트할 알림 설정 데이터
 */
export async function updatePreferences(
  userId: number,
  data: UpdatePreferencesDTO
) {
  return await db.notificationPreferences.upsert({
    where: { userId },
    update: {
      ...data,
    },
    create: {
      userId,
      ...data,
      pushEnabled: true, // Default
    },
  });
}
