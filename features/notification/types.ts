/**
 * File Name : features/notification/types.ts
 * Description : 알림 도메인 공용 타입 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   알림 타입, 필터, 목록 DTO, 푸시 상태 타입을 공용 정의로 분리
 * 2026.04.02  임도헌   Modified  알림 타입 alias 설명 보강
 */

/**
 * 인앱 알림과 웹 푸시 정책에서 공통으로 사용하는 알림 분류 키
 */
export type NotificationType =
  | "CHAT"
  | "TRADE"
  | "REVIEW"
  | "BADGE"
  | "STREAM"
  | "SYSTEM"
  | "KEYWORD";

/**
 * 알림 허용 여부와 방해 금지 시간 계산에 필요한 최소 설정 형태
 */
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
 * 관리자 조치 알림 생성 시 사용하는 시스템 알림 세부 타입
 */
export type AdminNotificationType =
  | "WARN_USER"
  | "DELETE_PRODUCT"
  | "DELETE_POST"
  | "DELETE_COMMENT"
  | "DELETE_REVIEW"
  | "DELETE_MESSAGE"
  | "DELETE_STREAM"
  | "BAN_USER"
  | "UNBAN_USER"
  | "CHANGE_ROLE";

/**
 * 알림 센터에서 지원하는 필터 그룹
 */
export type NotificationFilter =
  | "ALL"
  | "TRADE"
  | "CHAT"
  | "REVIEW"
  | "BADGE"
  | "STREAM"
  | "KEYWORD"
  | "SYSTEM";

/**
 * 푸시 토글 UI와 설정 화면에서 공통으로 해석하는 푸시 상태 값
 */
export type PushNotificationStatus =
  | "active"
  | "disabled"
  | "needs_reconnect"
  | "ios_install_required"
  | "unsupported"
  | "private_mode"
  | "permission_denied";

/**
 * 알림 설정 저장 액션과 서비스가 함께 사용하는 업데이트 DTO
 */
export type UpdatePreferencesDTO = {
  chat: boolean;
  trade: boolean;
  review: boolean;
  badge: boolean;
  stream: boolean;
  system: boolean;
  keyword?: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
};

/**
 * 구독 엔드포인트 검증 API가 반환하는 상태 결과
 */
export type SubscriptionStatusCheckResult =
  | { isValid: true; reason: "active" }
  | { isValid: false; reason: "disabled_by_user" | "needs_reconnect" };

/**
 * 다중 기기 웹 푸시 발송 결과 집계 값
 */
export type SendPushResult = {
  sent: number;
  removed: number;
  disabled: number;
  errors: number;
};

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
  activeFilter: NotificationFilter;
  filterCounts: Record<NotificationFilter, number>;
}
