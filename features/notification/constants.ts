/**
 * File Name : features/notification/constants.ts
 * Description : 알림 도메인 공용 상수 정의
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   알림 필터 목록, 라벨, 페이지 크기를 공용 상수로 분리
 */

import type { NotificationFilter } from "@/features/notification/types";

/**
 * 알림 센터에서 개별 그룹으로 직접 노출하는 필터 목록
 */
export const DIRECT_NOTIFICATION_FILTERS: Exclude<
  NotificationFilter,
  "ALL" | "SYSTEM"
>[] = ["TRADE", "CHAT", "REVIEW", "BADGE", "STREAM", "KEYWORD"];

/**
 * 알림 센터 필터 버튼과 빈 상태 문구에서 공통으로 사용하는 표시 라벨
 */
export const NOTIFICATION_FILTER_LABELS: Record<NotificationFilter, string> = {
  ALL: "전체",
  TRADE: "거래",
  CHAT: "채팅",
  REVIEW: "후기",
  BADGE: "뱃지",
  STREAM: "방송",
  KEYWORD: "키워드",
  SYSTEM: "시스템",
};

/**
 * 알림 센터 기본 페이지 크기
 */
export const NOTIFICATION_PAGE_SIZE = 10;
