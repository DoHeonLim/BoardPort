/**
 * File Name : lib/cacheTags.ts
 * Description : next/cache 캐시 태그 표준화(전 도메인 통합) — revalidateTag / unstable_cache(tags) 공용
 * Author : 임도헌
 *
 * Key Points
 * - 태그는 "무효화 범위"를 지정하는 레이블이며, 문자열 템플릿은 오타/불일치를 만들기 쉬움
 * - 이 파일에서 태그 생성 함수를 중앙 집중화하여 일관성을 보장
 * - Producer(revalidateTag)와 Consumer(unstable_cache tags) 간의 매칭을 쉽게 함
 *
 * Convention
 * - USER_*    : 유저/프로필/팔로우/뱃지/리뷰/차단 등 userId 기반
 * - PRODUCT_* : 제품 상세/좋아요/조회수 + 프로필 제품 탭
 * - POST_*    : 게시글 상세/좋아요 상태/댓글
 * - STREAM_*  : 스트림/방송 상세 + 유저 방송국 리스트
 * - CHAT_*    : 채팅 관련
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.01  임도헌   Created   전 도메인 태그 통합 파일 도입(프로필/제품/게시글/스트림/채팅)
 * 2026.01.03  임도헌   Modified  Posts 목록 즉시 최신화를 위한 POST_LIST 태그 추가
 * 2026.01.04  임도헌   Modified  조회수 태그 통일: POST_VIEWS/RECORDING_VIEWS 추가(제품/게시글/녹화 공통 패턴 정렬)
 * 2026.01.08  임도헌   Modified  제품 목록 캐싱을 위한 PRODUCT_LIST 태그 추가
 * 2026.01.19  임도헌   Renamed   tags.ts-> cacheTags.ts
 * 2026.01.30  임도헌   Modified  주석 개선 및 태그별 무효화 시점 가이드 추가
 * 2026.02.04  임도헌   Modified  차단 관계 변경시 해당 유저의 캐시 무효화 진행하는 USER_BLOCK_UPDATE 태그 추가
 */

import "server-only";

// =============================================================================
// Common Utils
// =============================================================================

/**
 * 유저네임 -> ID 변환 캐시용 태그
 * - 대상: `resolveUserIdByUsername` 결과
 * - 무효화 시점: 유저가 닉네임을 변경했을 때
 */
export const USER_USERNAME_ID = (normalizedUsername: string) =>
  `user-username-id-${normalizedUsername}`;

// =============================================================================
// User Domain
// =============================================================================

/**
 * 유저 기본 정보 (Core Info)
 * - 대상: 프로필 상단 정보, 아바타, 닉네임, 가입일 등
 * - 무효화 시점: 프로필 수정(닉네임, 아바타 변경), 전화번호 인증 시
 */
export const USER_CORE_ID = (userId: number | string) =>
  `user-core-id-${userId}`;

/**
 * 팔로워 목록 및 카운트
 * - 대상: 특정 유저를 팔로우하는 사람들 목록, 팔로워 수
 * - 무효화 시점: 누군가 이 유저를 팔로우/언팔로우 했을 때
 */
export const USER_FOLLOWERS_ID = (ownerId: number | string) =>
  `user-followers-id-${ownerId}`;

/**
 * 팔로잉 목록 및 카운트
 * - 대상: 특정 유저가 팔로우하는 사람들 목록, 팔로잉 수
 * - 무효화 시점: 이 유저가 누군가를 팔로우/언팔로우 했을 때
 */
export const USER_FOLLOWING_ID = (ownerId: number | string) =>
  `user-following-id-${ownerId}`;

/**
 * 유저 보유 뱃지 목록
 * - 대상: 프로필 뱃지 섹션, 뱃지 모달
 * - 무효화 시점: 뱃지 획득 시 (크론잡, 액션 트리거 등)
 */
export const USER_BADGES_ID = (userId: number | string) =>
  `user-badges-id-${userId}`;

/**
 * 유저 평균 평점
 * - 대상: 프로필 헤더의 평점
 * - 무효화 시점: 이 유저가 판매한 물건에 대해 리뷰가 작성/삭제되었을 때
 */
export const USER_AVERAGE_RATING_ID = (userId: number | string) =>
  `user-average-rating-id-${userId}`;

/**
 * 유저가 받은 리뷰 목록 (초기 로딩용)
 * - 대상: 프로필 리뷰 섹션, 리뷰 모달 첫 페이지
 * - 무효화 시점: 리뷰 작성/삭제 시
 */
export const USER_REVIEWS_INITIAL_ID = (userId: number | string) =>
  `user-reviews-initial-id-${userId}`;

/**
 * 유저의 차단 목록 변경 (내가 누군가를 차단/해제함)
 * - 대상: 나를 위한 맞춤형 목록 캐시 (제품 목록 등)
 * - 무효화 시점: 차단/해제 액션 수행 시
 */
export const USER_BLOCK_UPDATE = (userId: number | string) =>
  `user-block-update-${userId}`;

/**
 * 전체 뱃지 메타데이터 목록
 * - 대상: 뱃지 모달의 전체 뱃지 리스트
 * - 무효화 시점: (거의 없음) 시스템 뱃지 추가/수정 시
 */
export const BADGES_ALL = () => "badges-all";

// =============================================================================
// Product Domain
// =============================================================================

export type UserProductsScopeType =
  | "SELLING"
  | "RESERVED"
  | "SOLD"
  | "PURCHASED";

/**
 * 유저별 제품 목록 (상태별 탭)
 * - 대상: 프로필 > 판매 내역 / 구매 내역 탭
 * - 무효화 시점:
 *   - 제품 생성/삭제 (SELLING)
 *   - 제품 상태 변경 (SELLING <-> RESERVED <-> SOLD)
 *   - 구매 확정 (PURCHASED)
 */
export const USER_PRODUCTS_SCOPE_ID = (
  scope: UserProductsScopeType,
  userId: number | string
) => `user-products-${scope}-id-${userId}`;

/**
 * 유저별 제품 상태 카운트 (탭 뱃지)
 * - 대상: 프로필 > 판매 내역 탭 상단 카운트 (판매중/예약중/판매완료 수)
 * - 무효화 시점: 제품 생성/삭제, 상태 변경 시
 */
export const USER_PRODUCTS_COUNTS_ID = (userId: number | string) =>
  `user-products-counts-id-${userId}`;

/**
 * 전체 제품 목록 (초기 로딩)
 * - 대상: 메인 `/products` 페이지 초기 데이터
 * - 무효화 시점: 제품 생성, 삭제 시
 */
export const PRODUCT_LIST = () => "product-list";

/**
 * 제품 상세 정보
 * - 대상: 제품 상세 페이지 (`/products/view/[id]`)
 * - 무효화 시점: 제품 정보 수정, 상태 변경, 조회수 증가, 좋아요 변경 등
 */
export const PRODUCT_DETAIL_ID = (productId: number | string) =>
  `product-detail-id-${productId}`;

/**
 * 제품 좋아요 상태
 * - 대상: 제품 상세 페이지의 좋아요 버튼 상태 및 카운트
 * - 무효화 시점: 좋아요/취소 시
 */
export const PRODUCT_LIKE_STATUS = (productId: number | string) =>
  `product-like-status-${productId}`;

/**
 * 제품 조회수
 * - 대상: 제품 상세 페이지 조회수
 * - 무효화 시점: 조회수 증가 로직(`incrementViews`) 실행 시
 */
export const PRODUCT_VIEWS = (productId: number | string) =>
  `product-views-${productId}`;

// =============================================================================
// Post Domain
// =============================================================================

/**
 * 전체 게시글 목록 (초기 로딩)
 * - 대상: 메인 `/posts` 페이지 초기 데이터
 * - 무효화 시점: 게시글 생성, 삭제 시
 */
export const POST_LIST = () => "post-list";

/**
 * 게시글 상세 정보
 * - 대상: 게시글 상세 페이지 (`/posts/[id]`)
 * - 무효화 시점: 게시글 수정/삭제, 좋아요 변경, 댓글 작성/삭제 등
 */
export const POST_DETAIL = (postId: number | string) =>
  `post-detail-id-${postId}`;

/**
 * 게시글 좋아요 상태
 * - 대상: 게시글 상세 페이지 좋아요 버튼
 * - 무효화 시점: 좋아요/취소 시
 */
export const POST_LIKE_STATUS = (postId: number | string) =>
  `post-like-status-id-${postId}`;

/**
 * 게시글 댓글 목록
 * - 대상: 게시글 상세 페이지 댓글 섹션 (초기 로딩)
 * - 무효화 시점: 댓글 작성/삭제 시
 */
export const POST_COMMENTS = (postId: number | string) =>
  `post-comments-id-${postId}`;

/**
 * 게시글 조회수
 * - 대상: 게시글 상세 페이지 조회수
 * - 무효화 시점: 조회수 증가 로직 실행 시
 */
export const POST_VIEWS = (postId: number | string) => `post-views-${postId}`;

// =============================================================================
// Stream Domain
// =============================================================================

/**
 * 유저 방송국 (최근 방송/녹화 목록)
 * - 대상: 프로필 > 방송국 탭 (Rail), 채널 페이지 그리드
 * - 무효화 시점: 방송 시작/종료(생성/삭제), 썸네일 변경 시
 */
export const USER_STREAMS_ID = (ownerId: number | string) =>
  `user-streams-id-${ownerId}`;

/**
 * 방송/녹화 상세 정보
 * - 대상: 라이브 상세, 녹화본 상세 페이지
 * - 무효화 시점: 방송 상태 변경(Connected/Ended), VOD 생성 완료(Ready), 정보 수정 시
 */
export const BROADCAST_DETAIL = (broadcastId: number | string) =>
  `broadcast-detail-${broadcastId}`;

/**
 * 녹화본(VOD) 조회수
 * - 대상: 녹화본 상세 페이지 조회수
 * - 무효화 시점: 조회수 증가 로직 실행 시
 */
export const RECORDING_VIEWS = (vodId: number | string) =>
  `recording-views-${vodId}`;

/**
 * 녹화본 댓글 목록
 * - 대상: 녹화본 상세 페이지 댓글 섹션
 * - 무효화 시점: 댓글 작성/삭제 시
 */
export const RECORDING_COMMENTS = (vodId: number) =>
  `recording-comments-${vodId}`;

// =============================================================================
// Chat Domain
// =============================================================================

/**
 * 채팅방 목록 (전역)
 * - 대상: (잘 안 쓰임) 관리자용 등 전체 목록 갱신 필요 시
 * - 무효화 시점: 채팅방 생성/삭제 시
 */
export const CHAT_ROOMS = () => "chat-rooms";

/**
 * 유저별 채팅방 목록
 * - 대상: 채팅 탭 (`/chat`) 목록
 * - 무효화 시점:
 *   - 새 메시지 수신/전송 (Last Message 갱신)
 *   - 메시지 읽음 처리 (Unread Count 갱신)
 *   - 채팅방 나가기
 */
export const CHAT_ROOMS_ID = (userId: number | string) =>
  `chat-rooms-id-${userId}`;
