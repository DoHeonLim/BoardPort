/**
 * File Name : features/post/constants.ts
 * Description : 게시글 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.29  임도헌   Created
 * 2025.05.29  임도헌   Modified  기존 select 쿼리 상수로 분리
 * 2026.01.19  임도헌   Moved     lib/post -> features/post/lib
 * 2026.01.19  임도헌   Renamed   PostSelect -> constants 이름 변경
 * 2026.01.22  임도헌   Moved     lib/constants.ts -> constants.ts
 * 2026.01.24  임도헌   Modified  lib/constants.ts에서 POST_CATEGORY 이관 및 통합
 * 2026.01.27  임도헌   Modified  주석 보강
 * 2026.03.12  임도헌   Modified  사용자 업로드 이미지의 애니메이션 메타 조회 필드 추가
 * 2026.03.28  임도헌   Modified  게시글 추가/수정 폼 전용 plain category label 상수 추가
 * 2026.03.30  임도헌   Modified  이모지는 유지하고 카테고리 라벨을 자유/모집/후기/공략/질문 기준으로 단순화
 * 2026.03.31  임도헌   Modified  추천 카테고리 추가 및 폼/탭 라벨 상수 반영
 * 2026.04.02  임도헌   Modified  Prisma select 분리 및 게시글 동영상 정책 상수 이관
 */

// =============================================================================
// 1. Categories
// =============================================================================

/** 게시글 카테고리 (Enum 대용) */
export const POST_CATEGORY = {
  FREE: "⛵ 자유",
  CREW: "🏴‍☠️ 모집",
  LOG: "📜 후기",
  MAP: "🗺️ 공략",
  RECOMMEND: "🎲 추천",
  COMPASS: "🧭 질문",
} as const;

/** 게시글 추가/수정 폼용 카테고리 라벨 (텍스트 전용) */
export const POST_CATEGORY_FORM_LABEL = {
  FREE: "자유",
  CREW: "모집",
  LOG: "후기",
  MAP: "공략",
  RECOMMEND: "추천",
  COMPASS: "질문",
} as const;

/** 게시글 카테고리 키 유니온 타입 */
export type PostCategoryType = keyof typeof POST_CATEGORY;

/** 카테고리별 안내 문구 */
export const POST_CATEGORY_DESCRIPTIONS = {
  FREE: "자유롭게 이야기를 나눌 수 있는 공간입니다",
  CREW: "함께 보드게임을 즐길 사람을 모집하는 공간입니다",
  LOG: "보드게임 플레이 후기와 리뷰를 공유하는 공간입니다",
  MAP: "보드게임 규칙 설명과 공략을 공유하는 공간입니다",
  RECOMMEND: "상황에 맞는 보드게임 추천을 요청하거나 추천작을 나누는 공간입니다",
  COMPASS: "보드게임 질문과 답변을 나누는 공간입니다",
} as const;

/** 지역 필터를 기본값으로 우선 적용하는 카테고리 목록 */
export const LOCAL_FOCUSED_CATEGORIES = ["CREW", "FREE"];

// =============================================================================
// 2. Video Policy
// =============================================================================

/** 업로드 허용 비디오 MIME 타입 목록 */
export const POST_VIDEO_ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
] as const;

/** 업로드 허용 비디오 최대 용량 */
export const POST_VIDEO_MAX_SIZE_BYTES = 80 * 1024 * 1024;
/** 업로드 허용 비디오 최대 재생 시간 */
export const POST_VIDEO_MAX_DURATION_SEC = 60;
