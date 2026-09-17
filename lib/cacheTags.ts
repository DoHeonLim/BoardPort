/**
 * File Name : lib/cacheTags.ts
 * Description : Next.js 서버 사이드 캐시 태그 표준화 (정적/공통 데이터 전용)
 * Author : 임도헌
 *
 * 📋 [BoardPort 캐싱 정책 가이드]
 *
 * 1. Next.js fetch 캐시 (서버 사이드) - 현재 파일(cacheTags) 사용
 *    - 대상: 공통 콘텐츠 (모든 유저가 같은 데이터를 봄), 업데이트 빈도가 낮은 데이터
 *    - 예시: 카테고리 목록, 뱃지 전체 목록, 게시글 상세(본문), 상품 상세(본문)
 *    - 효과: 유효 기간에 동일한 공통 데이터의 반복 DB 조회 감소
 *
 * 2. TanStack Query (클라이언트 사이드) - queryKeys.ts 사용
 *    - 대상: 개인화 데이터, 실시간 데이터, 클라이언트 탐색 맥락을 유지해야 하는 목록
 *    - 예시: 내 동네/차단이 필터링된 상품 목록, 보드게임 도감 목록, 채팅방 목록, 알림 목록, 좋아요 상태
 *    - 효과: 유효한 동일 query key 재사용과 탐색 문맥의 즉각적인 화면 복원
 *
 * 3. 혼합 사용 (상세 페이지 패턴)
 *    - 상세 본문(공통)은 Next.js 캐시를 사용
 *    - 좋아요 여부, 내 댓글(개인화) 등은 TanStack Query 사용
 *    - 수정/삭제 Action은 최신성 계약에 따라 `updateTag` 또는 `revalidateTag`를 사용하고 클라이언트는 관련 `invalidateQueries` 호출
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
 * 2026.03.04  임도헌   Modified  캐싱 가이드라인 확립에 따른 공통/정적 데이터 태그만 유지 (개인화 태그 전면 삭제)
 * 2026.05.08  임도헌   Modified  TanStack Query 대상 설명에 보드게임 도감 탐색 캐시 반영
 * 2026.09.09  임도헌   Modified  실측 근거 없는 절감 수치를 제거하고 최신성 경계별 무효화 정책 반영
 */

import "server-only";

// =============================================================================
// 1. Static Data (거의 변하지 않는 정적 데이터)
// =============================================================================

export const BADGES_ALL = () => "badges-all";
export const PRODUCT_CATEGORIES = () => "product-categories";
export const STREAM_CATEGORIES = () => "stream-categories";

// =============================================================================
// 2. Common Detail Data (모든 유저가 동일하게 보는 상세 본문 데이터)
// =============================================================================

/** 상품 상세 원본 정보 (수정·삭제 시 무효화, 거래·숨김·조회수·좋아요 상태는 별도 최신 조회) */
export const PRODUCT_DETAIL = (id: number | string) => `product-detail-${id}`;

/** 게시글 상세 원본 정보 (수정·삭제 시 무효화, 조회수·댓글 수·좋아요 상태는 별도 최신 조회) */
export const POST_DETAIL = (id: number | string) => `post-detail-${id}`;

/** 방송/녹화 상세 원본 정보 (상태 변경, VOD 변환 시 무효화) */
export const BROADCAST_DETAIL = (id: number | string) =>
  `broadcast-detail-${id}`;
