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
 */
import "server-only";

import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";
import type { ProductDetailType } from "@/features/product/types";

/**
 * 제품 상세 정보 데이터 조회 로직
 *
 * [데이터 가공 전략]
 * - 유저 정보, 태그, 카테고리 계층 구조, 이미지 목록, 좋아요 카운트 등 연관 데이터 조인 조회
 * - 이미지 노출 순서(order) 기준 오름차순 정렬 반환
 *
 * @param {number} id - 제품 ID
 * @returns {Promise<ProductDetailType | null>} 제품 상세 정보 반환
 */
export async function getProductDetail(
  id: number
): Promise<ProductDetailType | null> {
  try {
    const product = await db.product.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        images: {
          orderBy: { order: "asc" },
          select: { url: true, order: true },
        },
        category: {
          select: { eng_name: true, kor_name: true, icon: true, parent: true },
        },
        search_tags: { select: { name: true } },
        _count: { select: { product_likes: true } },
      },
    });
    return product as ProductDetailType | null;
  } catch (e) {
    console.error("getProductById Error:", e);
    return null;
  }
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
    () => getProductDetail(id),
    ["product-detail-data", String(id)],
    { tags: [T.PRODUCT_DETAIL(id)], revalidate: 3600 } // 1시간 유지 (업데이트 시 즉시 파기)
  )();
};

/**
 * 메타데이터 생성을 위한 경량 제품 조회 로직
 *
 * [데이터 가공 전략]
 * - SEO 및 OpenGraph 메타 태그 생성에 필수적인 제목(title)과 설명(description) 필드만 선택적으로 조회
 *
 * @param {number} id - 제품 ID
 */
export async function getProductTitleById(id: number) {
  try {
    return await db.product.findUnique({
      where: { id },
      select: { title: true, description: true },
    });
  } catch (e) {
    console.error("[getProductTitleById] Error:", e);
    return null;
  }
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
