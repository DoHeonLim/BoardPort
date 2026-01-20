/**
 * File Name : lib/cacheTags
 * Description : next/cache 캐시 태그 표준화(전 도메인 통합) — revalidateTag / unstable_cache(tags) 공용
 * Author : 임도헌
 *
 * Key Points
 * - 태그는 "무효화 범위"를 지정하는 레이블이며, 문자열 템플릿은 오타/불일치를 만들기 쉬움
 * - 따라서 태그 문자열 생성기를 단일 파일로 중앙집중화하여:
 *   1) 태그 네이밍 일관성 보장
 *   2) Producer(revalidateTag) ↔ Consumer(unstable_cache tags) 매칭이 쉬워짐
 *   3) 도메인별 입력 형태(scope object)는 유지하되, 최종 문자열만 여기서 생성
 *
 * Convention
 * - USER_* : 유저/프로필/팔로우/뱃지/리뷰 등 userId 기반
 * - PRODUCT_* : 제품 상세/좋아요/조회수 + 프로필 제품 탭
 * - POST_* : 게시글 상세/좋아요 상태/댓글
 * - STREAM_* : 스트림/방송 상세 + 유저 방송국 리스트
 * - CHAT_* : 채팅 관련(현재는 전역 tag가 있을 경우)
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.01  임도헌   Created   전 도메인 태그 통합 파일 도입(프로필/제품/게시글/스트림/채팅)
 * 2026.01.03  임도헌   Modified  Posts 목록 즉시 최신화를 위한 POST_LIST 태그 추가
 * 2026.01.04  임도헌   Modified  조회수 태그 통일: POST_VIEWS/RECORDING_VIEWS 추가(제품/게시글/녹화 공통 패턴 정렬)
 * 2026.01.08  임도헌   Modified  제품 목록 캐싱을 위한 PRODUCT_LIST 태그 추가
 * 2026.01.19  임도헌   Renamed   tags.ts-> cacheTags.ts
 */

import "server-only";

/** 공통: username은 "정규화된 값"을 입력으로 받는 것을 원칙으로 한다. */
export const USER_USERNAME_ID = (normalizedUsername: string) =>
  `user-username-id-${normalizedUsername}`;

// User / Profile (per-id)
export const USER_CORE_ID = (userId: number | string) =>
  `user-core-id-${userId}`;

export const USER_FOLLOWERS_ID = (ownerId: number | string) =>
  `user-followers-id-${ownerId}`;

export const USER_FOLLOWING_ID = (ownerId: number | string) =>
  `user-following-id-${ownerId}`;

export const USER_BADGES_ID = (userId: number | string) =>
  `user-badges-id-${userId}`;

export const USER_AVERAGE_RATING_ID = (userId: number | string) =>
  `user-average-rating-id-${userId}`;

export const USER_REVIEWS_INITIAL_ID = (userId: number | string) =>
  `user-reviews-initial-id-${userId}`;

/** 전역 배지 목록 */
export const BADGES_ALL = () => "badges-all";

// Products (profile tabs + detail)
export type UserProductsScopeType =
  | "SELLING"
  | "RESERVED"
  | "SOLD"
  | "PURCHASED";

export const USER_PRODUCTS_SCOPE_ID = (
  scope: UserProductsScopeType,
  userId: number | string
) => `user-products-${scope}-id-${userId}`;

export const USER_PRODUCTS_COUNTS_ID = (userId: number | string) =>
  `user-products-counts-id-${userId}`;

/** 제품 목록(탭 페이지) - 전체 목록 캐싱용 */
export const PRODUCT_LIST = () => "product-list";

/** 제품 상세(프로필/리뷰/상태변경 등 여러 도메인에서 무효화됨) */
export const PRODUCT_DETAIL_ID = (productId: number | string) =>
  `product-detail-id-${productId}`;

/** 제품 좋아요 상태 (viewer personalization이 있어도 tag는 제품 단위로 통일) */
export const PRODUCT_LIKE_STATUS = (productId: number | string) =>
  `product-like-status-${productId}`;

/** 제품 조회수 캐시/집계 */
export const PRODUCT_VIEWS = (productId: number | string) =>
  `product-views-${productId}`;

// Posts (list/detail/likes/comments)
/** 게시글 목록(탭 페이지) */
export const POST_LIST = () => "post-list";

export const POST_DETAIL = (postId: number | string) =>
  `post-detail-id-${postId}`;

export const POST_LIKE_STATUS = (postId: number | string) =>
  `post-like-status-id-${postId}`;

export const POST_COMMENTS = (postId: number | string) =>
  `post-comments-id-${postId}`;

/** 게시글 조회수 캐시/집계 (리스트는 유지하되, 상세/조회수 단위 무효화용) */
export const POST_VIEWS = (postId: number | string) => `post-views-${postId}`;

// Streams / Broadcast
export const USER_STREAMS_ID = (ownerId: number | string) =>
  `user-streams-id-${ownerId}`;

/** 방송/스트림 상세 */
export const BROADCAST_DETAIL = (broadcastId: number | string) =>
  `broadcast-detail-${broadcastId}`;

// Chat
/** 채팅방 목록(전역) */
export const CHAT_ROOMS = () => "chat-rooms";

/** 채팅방 목록(per-user) — viewer 단위로 정밀 무효화 */
export const CHAT_ROOMS_ID = (userId: number | string) =>
  `chat-rooms-id-${userId}`;

// Recording
/** 녹화본 댓글 */
export const RECORDING_COMMENTS = (vodId: number) =>
  `recording-comments-${vodId}`;

/** 녹화본(Recording/VOD) 조회수 캐시/집계 */
export const RECORDING_VIEWS = (vodId: number | string) =>
  `recording-views-${vodId}`;
