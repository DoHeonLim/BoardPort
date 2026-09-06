/**
 * File Name : features/product/service/detail.ts
 * Description : 제품 상세 조회 관련 로직 (본문, 타이틀, 상단바)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created
 * 2025.07.06  임도헌   Modified  getIsOwner import 변경
 * 2026.01.03  임도헌   Modified  ViewThrottle 기반 3분 쿨다운 조회수 증가 결과(null) 시 product.views fallback 유지
 * 2026.01.04  임도헌   Modified  incrementProductViews wrapper 도입(조회수 표시 보정 didIncrement 패턴 통일)
 * 2026.01.04  임도헌   Modified  wrapper(incrementProductViews) 제거 → lib/views/incrementViews 직접 호출로 단일 진입점 고정
 * 2026.01.19  임도헌   Moved     lib/product -> features/product/lib
 * 2026.01.19  임도헌   Modified  getIsOwner 제거 및 직접 비교 (세션 효율화)
 * 2026.01.20  임도헌   Moved     lib/getProductDetailData -> service/detail
 * 2026.01.22  임도헌   Modified  getCachedProductLikeStatus 호출 시 userId 전달
 * 2026.01.22  임도헌   Modified  Session 의존성 제거 (userId 주입)
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.13  임도헌   Modified  미사용 함수 getCachedProductTitleById 삭제(generateMetadata에서 getCachedProduct를 사용하므로 삭제함)
 * 2026.03.04  임도헌   Modified  getProductTitleById 다시 추가(metadata용 간소화 함수)
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.04.09  임도헌   Modified  판매완료 숨김 상품 접근 제어를 위해 hidden_at 필드를 상세/메타 조회에 포함
 * 2026.04.11  임도헌   Modified  제품 상세 이미지에도 isAnimated 메타를 포함해 GIF가 Next 최적화 경고 없이 렌더되도록 보강
 * 2026.04.14  임도헌   Modified  상세/모달 공통 서버 로더를 추가해 좋아요/차단 상태 조회 중복을 통합
 * 2026.05.03  임도헌   Modified  제품 상세에 연결된 보드게임 카탈로그 정보 포함
 * 2026.05.08  임도헌   Modified  제품 상세 보드게임 relation select를 공용 상수로 교체
 * 2026.06.18  임도헌   Modified  상세 캐시와 별도로 거래/숨김 상태를 최신 조회하도록 보강
 * 2026.08.27  임도헌   Modified  실제 미존재와 DB 조회 실패를 분리해 일시 오류가 404·null cache로 변환되지 않도록 보강
 * 2026.08.27  임도헌   Modified  상세 본문 cache와 변동성 높은 조회수를 분리해 최신 DB 값으로 덮어쓰도록 보강
 * 2026.08.31  임도헌   Modified  Next 서버 cache에서 문자열로 복원된 상세 날짜를 Date로 정규화
 */
import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import { PRODUCT_BOARD_GAME_RELATION_SELECT } from "@/features/boardgame/selects";
import type { ProductDetailType } from "@/features/product/types";
import { getProductLikeStatus } from "@/features/product/service/like";
import { checkBlockRelation } from "@/features/user/service/block";

/** Next 서버 cache를 거치며 직렬화된 날짜를 상세 도메인의 Date 계약으로 복원한다. */
function restoreProductDetailDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/**
 * 제품 상세 정보 데이터 조회 로직
 *
 * [데이터 가공 전략]
 * - 유저 정보, 태그, 카테고리 계층 구조, 이미지 목록, 좋아요 카운트 등 연관 데이터 조인 조회
 * - 이미지 노출 순서(order) 기준 오름차순 정렬 반환
 *
 * @param {number} id - 제품 ID
 * @returns {Promise<ProductDetailType | null>} 제품 상세 정보 반환
 * @throws {Error} 데이터베이스 상세 조회에 실패한 경우
 */
export async function getProductDetail(
  id: number
): Promise<ProductDetailType | null> {
  // 상세 본문에 필요한 연관 데이터 일괄 조회
  // findUnique의 null만 실제 미존재이며, DB 예외는 cache에 null로 저장하지 않고 상위로 전파한다.
  const product = await db.product.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      images: {
        orderBy: { order: "asc" },
        select: { url: true, order: true, isAnimated: true },
      },
      category: {
        select: { eng_name: true, kor_name: true, icon: true, parent: true },
      },
      search_tags: { select: { name: true } },
      board_games: {
        select: PRODUCT_BOARD_GAME_RELATION_SELECT,
      },
      _count: { select: { product_likes: true } },
    },
  });
  if (!product) return null;

  return {
    ...product,
    board_games: product.board_games.flatMap(({ boardGame }) => {
      const { locales, ...linkedBoardGame } = boardGame;
      const locale = locales[0];
      // 상세에서도 공개 한국어 locale이 없는 카탈로그 연결은 숨김
      if (!locale) return [];
      return [{ boardGame: { ...linkedBoardGame, locale } }];
    }),
  } as ProductDetailType;
}

/**
 * 제품 상세 정보 캐시 Wrapper
 *
 * [캐시 제어 전략]
 * - `unstable_cache`를 활용한 서버 사이드 렌더링 캐시 적용
 * - `PRODUCT_DETAIL` 태그를 주입하여 수정/상태 변경/삭제 시 On-demand 무효화 지원
 *
 * @param {number} id - 제품 ID
 */
export const getCachedProduct = (id: number) => {
  return nextCache(
    // 상세 원본 조회 위임
    () => getProductDetail(id),
    ["product-detail-data", String(id)],
    { tags: [T.PRODUCT_DETAIL(id)], revalidate: 3600 } // 1시간 유지 (업데이트 시 즉시 파기)
  )();
};

/**
 * 상세 페이지/모달에서 공통으로 쓰는 상세 조회 모델.
 * 공통 본문은 캐시된 상세 데이터를 재사용하고, 자주 바뀌는 거래/숨김/조회수 상태와
 * 개인화된 좋아요/차단 상태만 별도 조회
 */
export async function getProductDetailViewData(
  id: number,
  userId: number | null
) {
  // 공통 본문 캐시는 유지하되, 채팅 약속 수락처럼 상태만 바뀌는 경로는 최신 DB 값을 덮어쓴다.
  const [product, likeStatus, liveState] = await Promise.all([
    getCachedProduct(id),
    getProductLikeStatus(id, userId),
    db.product.findUnique({
      where: { id },
      select: {
        reservation_userId: true,
        purchase_userId: true,
        hidden_at: true,
        views: true,
      },
    }),
  ]);

  if (!product || !liveState) {
    return {
      product: null,
      likeStatus,
      isOwner: false,
      isBlocked: false,
    };
  }

  const productWithLiveState: ProductDetailType = {
    ...product,
    // unstable_cache 저장값은 ISO 문자열로 복원될 수 있으므로 클라이언트 경계 전에 Date 계약을 회복한다.
    created_at: restoreProductDetailDate(product.created_at),
    refreshed_at: restoreProductDetailDate(product.refreshed_at),
    reservation_userId: liveState.reservation_userId,
    purchase_userId: liveState.purchase_userId,
    hidden_at: liveState.hidden_at,
    views: liveState.views,
  };

  const isOwner = userId === productWithLiveState.userId;
  // 상품 소유자 확인 이후에만 차단 관계 계산, 불필요한 조회 감소
  const isBlocked = userId
    ? await checkBlockRelation(userId, productWithLiveState.userId)
    : false;

  return {
    product: productWithLiveState,
    likeStatus,
    isOwner,
    isBlocked,
  };
}

/**
 * 메타데이터 생성을 위한 경량 제품 조회 로직
 *
 * [데이터 가공 전략]
 * - SEO 및 OpenGraph 메타 태그 생성에 필수적인 제목(title)과 설명(description) 필드만 선택적으로 조회
 *
 * @param {number} id - 제품 ID
 * @returns 상품 메타데이터 또는 실제 미존재 시 null
 * @throws {Error} 데이터베이스 메타데이터 조회에 실패한 경우
 */
export async function getProductTitleById(id: number) {
  // 메타데이터 최소 필드 조회. DB 장애는 "찾을 수 없음" 메타로 위장하지 않는다.
  return db.product.findUnique({
    where: { id },
    select: { title: true, description: true, hidden_at: true },
  });
}

/**
 * 상단바 UI 구성을 위한 경량 메타데이터 조회 로직
 *
 * [데이터 가공 전략]
 * - 상세 페이지 헤더(Topbar) 영역에 필요한 카테고리 정보, 소유자 ID(userId)만 최적화하여 조회
 * - 뒤로가기 버튼의 폴백 경로 및 수정 버튼 노출 여부 판별에 활용
 *
 * @param {number} id - 제품 ID
 */
export async function getProductTopbar(id: number) {
  // 상단바 전용 경량 메타 조회
  const product = await db.product.findUnique({
    where: { id },
    select: {
      userId: true,
      categoryId: true,
      category: {
        select: { id: true, kor_name: true, icon: true },
      },
    },
  });

  if (!product)
    // 상단바 폴백 메타 반환
    return {
      categoryId: null,
      categoryLabel: null,
      categoryIcon: null,
      isOwner: false,
      ownerId: null,
    };

  return {
    categoryId: product.categoryId,
    categoryLabel: product.category?.kor_name ?? null,
    categoryIcon: product.category?.icon ?? null,
    ownerId: product.userId,
  };
}
