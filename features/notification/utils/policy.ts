/**
 * File Name : features/notification/utils/policy.ts
 * Description : 알림 설정/타입 기반 알림/푸시 발송 정책 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.03  임도헌   Created   NotificationPreferences + quietHours 기반 canSendPushForType 추가
 * 2025.12.21  임도헌   Modified  pushEnabled는 푸시에만 영향, 앱 내 알림 생성은 타입 토글로만 제어
 * 2026.01.19  임도헌   Moved     lib/notification -> features/notification/lib
 * 2026.02.12  임도헌   Modified  KEYWORD 알림 타입 추가
 */

import { isWithinQuietHours } from "@/features/notification/utils/quietHours";

export type NotificationType =
  | "CHAT"
  | "TRADE"
  | "REVIEW"
  | "BADGE"
  | "STREAM"
  | "SYSTEM"
  | "KEYWORD";

export type NotificationPreferencesLike = {
  chat?: boolean;
  trade?: boolean;
  review?: boolean;
  badge?: boolean;
  system?: boolean;
  stream?: boolean;
  keyword?: boolean;
  pushEnabled?: boolean;
  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
};

/**
 * 앱 내 알림 생성 허용 여부 판단
 * - 유저의 타입별 알림 설정(chat, trade 등)을 확인
 * - pushEnabled는 고려하지 않음
 *
 * @param prefs - 유저 알림 설정
 * @param type - 알림 타입
 * @returns 알림 생성 허용 여부
 */
export function isNotificationTypeEnabled(
  prefs: NotificationPreferencesLike | null | undefined,
  type: NotificationType
): boolean {
  if (!prefs) return true;

  switch (type) {
    case "CHAT":
      return prefs.chat !== false;
    case "TRADE":
      return prefs.trade !== false;
    case "REVIEW":
      return prefs.review !== false;
    case "BADGE":
      return prefs.badge !== false;
    case "STREAM":
      return prefs.stream !== false;
    case "SYSTEM":
      return prefs.system !== false;
    case "KEYWORD":
      return prefs.keyword !== false;
    default:
      return true;
  }
}

/**
 * 푸시 알림 전송 허용 여부 판단
 * - 알림 타입 설정, 전역 푸시 설정(pushEnabled), 방해 금지 시간을 모두 확인합니다.
 *
 * @param prefs - 유저 알림 설정
 * @param type - 알림 타입
 * @param now - 현재 시각 (기본값: now())
 * @param timeZone - 타임존 (기본값: Asia/Seoul)
 * @returns 푸시 전송 허용 여부
 */
export function canSendPushForType(
  prefs: NotificationPreferencesLike | null | undefined,
  type: NotificationType,
  now: Date = new Date(),
  timeZone: string = "Asia/Seoul"
): boolean {
  if (!isNotificationTypeEnabled(prefs, type)) return false;

  // 전역 푸시 스위치
  if (prefs?.pushEnabled === false) return false;

  const start = prefs?.quietHoursStart ?? null;
  const end = prefs?.quietHoursEnd ?? null;

  if (isWithinQuietHours(start, end, now, timeZone)) {
    return false;
  }

  return true;
}
