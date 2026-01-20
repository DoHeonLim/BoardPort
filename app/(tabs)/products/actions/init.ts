/**
 * File Name : app/(tabs)/products/actions/init
 * Description : 초기 제품 로딩, 무한 스크롤
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.29  임도헌   Created
 * 2025.05.29  임도헌   Modified  app/(tabs)/products/actions.ts 파일을 기능별로 분리
 * 2025.05.29  임도헌   Modified  초기 제품 로딩 기능 분리
 * 2025.05.29  임도헌   Modified  무한 스크롤 기능 분리
 * 2025.09.02  임도헌   Modified  TAKE 상수 PRODUCTS_PAGE_TAKE로 변경
 * 2025.11.05  임도헌   Modified  초기 로딩도 TAKE+1로 페이징 판단 + 정렬/커서 id 기준으로 통일
 * 2026.01.08  임도헌   Modified  초기 로딩에 unstable_cache + PRODUCT_LIST 태그 적용
 */

"use server";

import db from "@/lib/db";
import { PRODUCT_SELECT } from "@/features/product/lib/constants";
import type { Paginated, ProductType } from "@/types/product";
import { PRODUCTS_PAGE_TAKE } from "@/lib/constants";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";

const TAKE = PRODUCTS_PAGE_TAKE;

/**
 * 내부 Fetcher 함수 (캐시 래핑용)
 */
async function fetchInitialProductsRaw(): Promise<Paginated<ProductType>> {
  const rows = (await db.product.findMany({
    select: PRODUCT_SELECT,
    orderBy: { id: "desc" },
    take: TAKE + 1,
  })) as ProductType[];

  const hasNext = rows.length > TAKE;
  const products = hasNext ? rows.slice(0, TAKE) : rows;
  const nextCursor = hasNext ? products[products.length - 1]!.id : null;

  return { products, nextCursor };
}

/**
 * 초기 제품 TAKE개(+1) 가져오기 (Cached)
 * - PRODUCT_LIST 태그를 사용하여 제품 생성/수정 시 무효화 가능하도록 설정
 */
export const getInitialProducts = async (): Promise<Paginated<ProductType>> => {
  const cached = nextCache(fetchInitialProductsRaw, ["product-list-initial"], {
    tags: [T.PRODUCT_LIST()],
    revalidate: 60, // 1분 (보조적)
  });

  return cached();
};

/**
 * 무한 스크롤: 다음 TAKE개 가져오기
 * - 정렬/커서 id desc로 통일
 * - 무한 스크롤은 커서가 동적이므로 캐시하지 않음
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
