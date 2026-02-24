/**
 * File Name : features/product/service/list.ts
 * Description : 제품 목록 조회 및 검색 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   목록/검색 로직 통합 및 Service 패턴 적용
 * 2026.01.20  임도헌   Merged    lib/queries.ts (검색 쿼리 빌더) 통합
 * 2026.02.03  임도헌   Modified  목록 정렬 기준을 created_at -> refreshed_at으로 변경 (끌어올리기 반영)
 * 2026.02.04  임도헌   Modified  getBlockedUserIds로 차단된 유저 필터링 로직 추가
 * 2026.02.15  임도헌   Modified  내 동네(Local-First) 필터링 로직 구현
 * 2026.02.20  임도헌   Modified  주석 최신화 및 JSDoc 적용
 * 2026.02.22  임도헌   Modified  정지된 유저(Banned)의 상품 완벽 은닉
 */
import "server-only";
import { unstable_cache as nextCache } from "next/cache";
import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import * as T from "@/lib/cacheTags";
import { PRODUCTS_PAGE_TAKE } from "@/lib/constants";
import { getBlockedUserIds } from "@/features/user/service/block";
import { PRODUCT_SELECT } from "@/features/product/constants";
import type {
  ProductSearchParams,
  Paginated,
  ProductType,
} from "@/features/product/types";
import { buildRegionWhere } from "@/features/user/utils/region";

const TAKE = PRODUCTS_PAGE_TAKE;

/**
 * 검색 파라미터를 기반으로 Prisma Where 조건을 생성
 * (모든 접근은 로그인이 보장된 상태이므로 viewerId는 필수값)
 *
 * [Region Filtering Policy]
 * - DB에 저장된 유저의 `regionRange`(DONG/GU/CITY/ALL) 및 지역 정보를 기준으로 필터를 생성
 * - `buildRegionWhere` 유틸을 사용하여 특수 행정구역 예외 처리를 포함
 *
 * @param {ProductSearchParams} params - 검색 필터 객체 (keyword, category 등)
 * @param {number} viewerId - 조회자 ID (DB 지역 설정 조회용)
 * @returns {Promise<Prisma.ProductWhereInput>} Prisma Where 조건 객체
 */
async function buildSearchWhere(
  params: ProductSearchParams,
  viewerId: number
): Promise<Prisma.ProductWhereInput> {
  let categoryCondition: Prisma.ProductWhereInput = {};

  // 카테고리 필터 (대분류/소분류 처리)
  if (params.category) {
    const categoryId = parseInt(params.category);
    if (!isNaN(categoryId)) {
      const selectedCategory = await db.category.findUnique({
        where: { id: categoryId },
        include: { children: { select: { id: true } } },
      });

      if (selectedCategory) {
        if (selectedCategory.parentId === null) {
          // 대분류: 자신 + 자식 카테고리 모두 포함
          categoryCondition = {
            OR: [
              { categoryId: selectedCategory.id },
              {
                categoryId: {
                  in: selectedCategory.children.map((child) => child.id),
                },
              },
            ],
          };
        } else {
          // 소분류: 해당 카테고리만
          categoryCondition = { categoryId: selectedCategory.id };
        }
      }
    }
  }

  // 1. 사용자 지역 및 범위(Range) 설정 조회
  const user = await db.user.findUnique({
    where: { id: viewerId },
    select: { region1: true, region2: true, region3: true, regionRange: true },
  });

  // 2. DB 범위(Range) 설정에 따른 필터 분기 (Fallback 포함)
  const regionCondition = user ? buildRegionWhere(user) : {};

  // 가격 필터 정규화
  const minPrice =
    params.minPrice !== undefined && !isNaN(Number(params.minPrice))
      ? Number(params.minPrice)
      : undefined;
  const maxPrice =
    params.maxPrice !== undefined && !isNaN(Number(params.maxPrice))
      ? Number(params.maxPrice)
      : undefined;

  return {
    AND: [
      { user: { bannedAt: null } },
      params.keyword
        ? {
            OR: [
              { title: { contains: params.keyword } },
              { description: { contains: params.keyword } },
              { search_tags: { some: { name: { contains: params.keyword } } } },
            ],
          }
        : {},
      categoryCondition,
      regionCondition,
      {
        price: {
          ...(minPrice !== undefined && { gte: minPrice }),
          ...(maxPrice !== undefined && { lte: maxPrice }),
        },
      },
      params.game_type ? { game_type: params.game_type } : {},
      params.condition ? { condition: params.condition } : {},
    ],
  };
}

/**
 * 제품 목록을 DB에서 조회 (Internal)
 */
async function fetchProductsRaw(
  params: ProductSearchParams,
  viewerId: number,
  cursor?: number | null
): Promise<Paginated<ProductType>> {
  const where = await buildSearchWhere(params, viewerId);

  // 차단 유저 필터링 (필수 보안)
  const blockedIds = await getBlockedUserIds(viewerId);
  if (blockedIds.length > 0) {
    where.userId = { notIn: blockedIds };
  }

  const cursorObj = cursor ? { id: cursor } : undefined;

  const rows = await db.product.findMany({
    where,
    select: PRODUCT_SELECT,
    // 끌어올리기 반영 정렬
    orderBy: [{ refreshed_at: "desc" }, { id: "desc" }],
    take: (params.take ?? TAKE) + 1,
    skip: cursor ? 1 : params.skip ?? 0,
    cursor: cursorObj,
  });

  const hasNext = rows.length > (params.take ?? TAKE);
  const products = hasNext ? rows.slice(0, params.take ?? TAKE) : rows;
  const nextCursor = hasNext ? products[products.length - 1].id : null;

  return { products, nextCursor };
}

/**
 * 초기 목록 조회 (Cached)
 * - 필터가 없는 초기 진입 시 사용자별로 캐싱된 목록을 반환
 * - 필터가 있는 경우 실시간 데이터를 조회
 *
 * @param {ProductSearchParams} params - 검색 파라미터
 * @param {number} viewerId - 조회자 ID (필수)
 * @returns {Promise<Paginated<ProductType>>}
 */
export async function getCachedProducts(
  params: ProductSearchParams,
  viewerId: number
): Promise<Paginated<ProductType>> {
  const hasFilter =
    !!params.keyword ||
    !!params.category ||
    !!params.minPrice ||
    !!params.maxPrice ||
    !!params.game_type ||
    !!params.condition;

  // 필터가 있으면 실시간 조회
  if (hasFilter) {
    return fetchProductsRaw(params, viewerId, null);
  }

  // 필터 없는 초기 목록은 사용자별 캐싱
  const key = `products-initial-user-${viewerId}`;
  return nextCache(
    async () => fetchProductsRaw(params, viewerId, null),
    [key],
    {
      tags: [
        T.PRODUCT_LIST(),
        T.USER_BLOCK_UPDATE(viewerId),
        T.USER_CORE_ID(viewerId), // 내 동네(Region) 변경 시 캐시 무효화
      ],
    }
  )();
}

/**
 * 무한 스크롤용 추가 목록 조회
 * - 커서와 검색 조건을 받아 다음 페이지 데이터를 조회
 *
 * @param {number | null} cursor - 마지막 아이템 ID
 * @param {ProductSearchParams} params - 검색 조건 (필터링 유지용)
 * @param {number} viewerId - 조회자 ID (필수)
 * @returns {Promise<Paginated<ProductType>>}
 */
export const getMoreProducts = async (
  cursor: number | null,
  params: ProductSearchParams,
  viewerId: number
): Promise<Paginated<ProductType>> => {
  return fetchProductsRaw(params, viewerId, cursor);
};
