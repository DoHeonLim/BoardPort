/**
 * File Name : features/notification/lib/policy.ts
 * Description : 알림 설정/타입 기반 알림/푸시 발송 정책 유틸리티
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.12.03  임도헌   Created   NotificationPreferences + quietHours 기반 canSendPushForType 추가
 * 2025.12.21  임도헌   Modified  pushEnabled는 푸시에만 영향, 앱 내 알림 생성은 타입 토글로만 제어
 * 2026.01.19  임도헌   Moved     lib/notification -> features/notification/lib
 */

import { isWithinQuietHours } from "@/features/notification/lib/quietHours";

export type NotificationType =
  | "CHAT"
  | "TRADE"
  | "REVIEW"
  | "BADGE"
  | "SYSTEM"
  | "STREAM";

export type NotificationPreferencesLike = {
  chat?: boolean;
  trade?: boolean;
  review?: boolean;
  badge?: boolean;
  system?: boolean;
  stream?: boolean;

  /** pushEnabled는 "푸시"만 제어(앱 내 알림 생성에는 영향 없음) */
  pushEnabled?: boolean;

  quietHoursStart?: string | null;
  quietHoursEnd?: string | null;
};

/**
 * isNotificationTypeEnabled
 * - "앱 내 알림(Notification row 생성 + 실시간 브로드캐스트)" 여부 판단
 *
 * 규칙:
 * - prefs가 없으면: 기본 허용(true)
 * - 타입별 필드가 false면: 해당 타입 알림 비활성(false)
 * - pushEnabled는 여기서 고려하지 않음(푸시만 끌 수 있어야 함)
 */
export function isNotificationTypeEnabled(
  prefs: NotificationPreferencesLike | null | undefined,
  type: NotificationType
): boolean {
  if (!prefs) return true; // 설정 없으면 기본 허용

  switch (type) {
    case "CHAT":
      return prefs.chat !== false;
    case "TRADE":
      return prefs.trade !== false;
    case "REVIEW":
      return prefs.review !== false;
    case "BADGE":
      return prefs.badge !== false;
    case "SYSTEM":
      return prefs.system !== false;
    case "STREAM":
      return prefs.stream !== false;
    default:
      return true;
  }
}

/**
 * canSendPushForType
 * - "푸시" 전송 가능 여부 판단
 *
 * 규칙:
 * - 타입 알림 자체가 OFF면: 푸시도 OFF
 * - pushEnabled === false면: 푸시 OFF (앱 내 알림은 가능)
 * - quietHours 안이면: 푸시 OFF
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
