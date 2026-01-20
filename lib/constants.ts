/**
 * File Name : lib/constants
 * Description : 상수 파일
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.04  임도헌   Created
 * 2024.10.04  임도헌   Modified  패스워드 관련 상수 추가
 * 2024.10.17  임도헌   Modified  이미지 최대 크기 상수 추가
 * 2024.12.10  임도헌   Modified  이미지 스켈레톤 상수 추가
 * 2025.04.13  임도헌   Modified  제품 관련 상수 추가
 * 2025.05.22  임도헌   Modified  스트리밍 접근 제어 상수 추가
 */

// 패스워드 최소 값
export const PASSWORD_MIN_LENGTH = 8;

// 페이지네이션 TAKE (도메인별 분리 — 값은 도메인 특성에 맞춤)
export const POSTS_PAGE_TAKE = 10;
export const PRODUCTS_PAGE_TAKE = 10;
export const STREAMS_PAGE_TAKE = 12;

// 패스워드 정규표현식 체크
export const PASSWORD_REGEX = new RegExp(
  /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).+$/
);
// 패스워드 정규표현식 에러 메시지
export const PASSWORD_REGEX_ERROR =
  "비밀번호는 소문자, 대문자, 숫자, 특수문자를 포함해야 합니다.";

// 이미지 최대 크기
export const MAX_PHOTO_SIZE = 3 * 1024 * 1024;

// base64로 인코딩된 이미지 픽셀(1*1) - #d0d0d0색상
export const BLUR_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mO8UA8AAiUBUcc3qzwAAAAASUVORK5CYII=";

// 게시글 카테고리
export const POST_CATEGORY = {
  FREE: "⛵ 자유", // 자유
  CREW: "🏴‍☠️ 모험대원 모집", // 게임 모임/파티 모집
  LOG: "📜 항해 일지", // 게임 후기/리뷰
  MAP: "🗺️ 보물지도", // 게임 규칙/공략
  COMPASS: "🧭 나침반", // 질문과 답변
} as const;

// 제품 필터 타입
export type FilterState = {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  game_type?: string;
  condition?: string;
};

// 게시글 카테고리 타입
export type PostCategory = keyof typeof POST_CATEGORY;

// 제품 관련 상수
export const GAME_TYPES = ["BOARD_GAME", "TRPG", "CARD_GAME"] as const;
export const CONDITION_TYPES = ["NEW", "LIKE_NEW", "GOOD", "USED"] as const;
export const COMPLETENESS_TYPES = [
  "PERFECT",
  "USED",
  "REPLACEMENT",
  "INCOMPLETE",
] as const;

// 한글 표시를 위한 매핑
export const GAME_TYPE_DISPLAY = {
  BOARD_GAME: "보드게임",
  TRPG: "TRPG",
  CARD_GAME: "카드게임",
} as const;

export const CONDITION_DISPLAY = {
  NEW: "새제품급",
  LIKE_NEW: "거의새것",
  GOOD: "사용감있음",
  USED: "많이사용됨",
} as const;

export const COMPLETENESS_DISPLAY = {
  PERFECT: "완벽",
  USED: "사용감 있음",
  REPLACEMENT: "대체 부품",
  INCOMPLETE: "부품 누락",
} as const;

// 스트리밍 접근 제어 상수
export const STREAM_VISIBILITY = {
  PUBLIC: "PUBLIC", // 모든 사용자 접근 가능
  PRIVATE: "PRIVATE", // 비밀번호로 보호 (비공개)
  FOLLOWERS: "FOLLOWERS", // 팔로워만 접근 가능
} as const;

// 스트리밍 접근 제어 타입
export type StreamVisibility =
  (typeof STREAM_VISIBILITY)[keyof typeof STREAM_VISIBILITY];

// 스트리밍 접근 제어 한글 표시
export const STREAM_VISIBILITY_DISPLAY = {
  PUBLIC: "공개",
  PRIVATE: "비공개",
  FOLLOWERS: "팔로워",
} as const;

// 스트리밍 상태 상수 정의
export const STREAM_STATUS = {
  CREATED: "CREATED", // 생성됨 (방송 시작 전)
  CONNECTED: "CONNECTED", // 연결됨 (방송 중)
  DISCONNECTED: "DISCONNECTED", // 연결 해제됨
  FAILED: "FAILED", // 실패
} as const;

// 스트리밍 카테고리
export const STREAM_CATEGORY = {
  GAME_PLAY: "🎮 게임 플레이",
  REVIEW: "📝 리뷰",
  WORKTHROUGH: "📚 공략",
  COMMUNITY: "💬 커뮤니티",
} as const;
