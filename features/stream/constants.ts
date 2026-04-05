/**
 * File Name : features/stream/constants.ts
 * Description : 스트리밍 도메인 공용 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.13  임도헌   Created
 * 2025.08.24  임도헌   Modified  password 제거(민감 필드)
 * 2026.01.19  임도헌   Moved     lib/constants -> features/stream/lib
 * 2026.01.19  임도헌   Renamed   streamSelect -> constants 이름 변경
 * 2026.01.25  임도헌   Modified  도메인별 상수(AUTH, PRODUCT 등)를 각 Feature로 이관
 * 2026.01.25  임도헌   Modified  STREAM_SELECT 제거 -> BROADCAST_SUMMARY_SELECT로 대체 및 Enum 상수 추가
 * 2026.03.12  임도헌   Modified  스트림 썸네일 애니메이션 메타 조회 필드 추가
 * 2026.04.02  임도헌   Modified  BROADCAST_SUMMARY_SELECT를 selects.ts로 분리하고 스트림 상수 설명 보강
 * 2026.04.03  임도헌   Modified  스트림 채팅 고정 공지 최대 길이 상수 추가
 */

// =============================================================================
// 1. Enum / Visibility
// =============================================================================

/** 방송 공개 범위 목록 */
export const STREAM_VISIBILITY = {
  PUBLIC: "PUBLIC",
  PRIVATE: "PRIVATE",
  FOLLOWERS: "FOLLOWERS",
} as const;

/** 방송 송출 상태 목록 */
export const STREAM_STATUS = {
  CREATED: "CREATED",
  CONNECTED: "CONNECTED",
  DISCONNECTED: "DISCONNECTED",
  ENDED: "ENDED",
} as const;

/** VOD 처리 상태 목록 */
export const VOD_STATUS = {
  QUEUED: "QUEUED",
  INPROGRESS: "INPROGRESS",
  READY: "READY",
  ERROR: "ERROR",
} as const;

// =============================================================================
// 2. Display Maps / Categories
// =============================================================================

/** 방송 공개 범위 표시 라벨 */
export const STREAM_VISIBILITY_DISPLAY = {
  PUBLIC: "공개",
  PRIVATE: "비공개",
  FOLLOWERS: "팔로워",
} as const;

/** 스트리밍 카테고리 라벨 */
export const STREAM_CATEGORY = {
  GAME_PLAY: "🎮 게임 플레이",
  REVIEW: "📝 리뷰",
  WORKTHROUGH: "📚 공략",
  COMMUNITY: "💬 커뮤니티",
} as const;

/** 스트림 채팅 상단 고정 공지 최대 길이 */
export const STREAM_PINNED_NOTICE_MAX_LENGTH = 160;
