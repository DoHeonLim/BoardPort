/**
 * File Name : features/notification/service/preference.ts
 * Description : 알림 설정(Preferences) DB 관리 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.23  임도헌   Created   NotificationPreferences 로직 분리
 * 2026.02.12  임도헌   Modified  keyword 필드 추가
 * 2026.03.12  임도헌   Modified  keyword 미전달 시 기존 설정을 유지하도록 partial update 지원
 * 2026.04.02  임도헌   Modified  알림 설정 업데이트 DTO를 notification/types 공용 정의로 분리
 * 2026.04.04  임도헌   Modified  pushEnabled 유지와 create 기본값 의도를 인라인 주석으로 보강
 */

import "server-only";
import db from "@/lib/db";
import type { UpdatePreferencesDTO } from "@/features/notification/types";

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
      // 푸시 전역 토글은 subscription 서비스에서만 관리
      ...data,
    },
    create: {
      userId,
      ...data,
      // 신규 사용자 기본값
      keyword: data.keyword ?? true,
      pushEnabled: true, // Default
    },
  });
}
