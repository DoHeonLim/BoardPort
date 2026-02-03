/**
 * File Name : features/product/service/list.ts
 * Description : 제품 목록 조회 및 검색 비즈니스 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.20  임도헌   Created   목록/검색 로직 통합 및 Service 패턴 적용
 * 2026.01.20  임도헌   Merged    lib/queries.ts (검색 쿼리 빌더) 통합
 * 2026.01.22  임도헌   Modified  주석 보강 (검색 쿼리 빌더 상세 설명)
 * 2026.01.25  임도헌   Modified  주석 보강
 */
import "server-only";
import { unstable_cache as nextCache } from "next/cache";
import db from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import * as T from "@/lib/cacheTags";
import { PRODUCTS_PAGE_TAKE } from "@/lib/constants";
import { PRODUCT_SELECT } from "@/features/product/constants";
import type {
  ProductSearchParams,
  Paginated,
  ProductType,
} from "@/features/product/types";

const TAKE = PRODUCTS_PAGE_TAKE;

/**
 * 검색 파라미터를 기반으로 Prisma Where 조건을 생성합니다.
 * 키워드(제목/설명/태그), 카테고리(대분류 포함), 가격, 게임타입 등 필터를 조합합니다.
 *
 * @param {ProductSearchParams} params - 검색 필터 객체
 * @returns {Promise<Prisma.ProductWhereInput>} Prisma Where 객체
 */
async function buildSearchWhere(
  params: ProductSearchParams
): Promise<Prisma.ProductWhereInput> {
  let categoryCondition: Prisma.ProductWhereInput = {};

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

  return {
    AND: [
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
      {
        price: {
          ...(params.minPrice !== undefined && { gte: params.minPrice }),
          ...(params.maxPrice !== undefined && { lte: params.maxPrice }),
        },
      },
      params.game_type ? { game_type: params.game_type } : {},
      params.condition ? { condition: params.condition } : {},
    ],
  };
}

/**
 * 제품 목록을 DB에서 조회합니다. (Internal)
 */
async function fetchProductsRaw(
  params: ProductSearchParams
): Promise<Paginated<ProductType>> {
  const where = await buildSearchWhere(params);

  const rows = (await db.product.findMany({
    where,
    select: PRODUCT_SELECT,
    orderBy: { id: "desc" },
    take: (params.take ?? TAKE) + 1,
    skip: params.skip ?? 0,
  })) as ProductType[];

  const hasNext = rows.length > (params.take ?? TAKE);
  const products = hasNext ? rows.slice(0, params.take ?? TAKE) : rows;
  const nextCursor = hasNext ? products[products.length - 1]!.id : null;

  return { products, nextCursor };
}

/**
 * 초기 목록 조회 (Cached)
 * 필터가 없는 초기 로딩에 사용하며, `product-list` 태그로 관리됨.
 *
 * @param {ProductSearchParams} params - 검색 파라미터
 * @returns {Promise<Paginated<ProductType>>}
 */
export async function getCachedProducts(
  params: ProductSearchParams
): Promise<Paginated<ProductType>> {
  const key = `products-${JSON.stringify(params)}`;
  const cached = nextCache(async () => fetchProductsRaw(params), [key], {
    tags: [T.PRODUCT_LIST()],
    // revalidate 제거: 순수 태그 기반 갱신
  });
  return cached();
}

/**
 * 목록 조회 (Non-Cached)
 * 실시간 검색 등 최신 데이터가 필요할 때 사용합니다.
 *
 * @param {ProductSearchParams} params - 검색 파라미터
 * @returns {Promise<Paginated<ProductType>>}
 */
export async function getProducts(
  params: ProductSearchParams
): Promise<Paginated<ProductType>> {
  return fetchProductsRaw(params);
}

/**
 * 무한 스크롤용 추가 목록 조회
 * `skip` 대신 `cursor`를 사용하여 성능을 최적화합니다.
 *
 * @param {number | null} cursor - 마지막 아이템 ID
 * @returns {Promise<Paginated<ProductType>>}
 */
export const getMoreProducts = async (
  cursor: number | null
): Promise<Paginated<ProductType>> => {
  const rows = (await db.product.findMany({
    select: PRODUCT_SELECT,
    orderBy: { id: "desc" },
    take: TAKE + 1,
    ...(cursor && { skip: 1, cursor: { id: cursor } }),
  })) as ProductType[];

  const hasNext = rows.length > TAKE;
  const products = hasNext ? rows.slice(0, TAKE) : rows;
  const nextCursor = hasNext ? products[products.length - 1]!.id : null;

  return { products, nextCursor };
};
