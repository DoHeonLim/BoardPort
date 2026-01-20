/**
 File Name : app/(tabs)/products/actions/search
 Description : 검색 처리, 카테고리 조회
 Author : 임도헌
 
 History
 Date        Author   Status    Description
 2025.05.29  임도헌   Created
 2025.05.29  임도헌   Modified  app/(tabs)/products/actions.ts 파일을 기능별로 분리
 2025.05.29  임도헌   Modified  검색 처리 기능 분리
 2025.05.29  임도헌   Modified  카테고리 조회 기능 분리
 */

"use server";

import db from "@/lib/db";
import { PRODUCT_SELECT } from "@/features/product/lib/constants";
import { getProductSearchCondition } from "@/features/product/lib/queries";
import { ProductType } from "@/types/product";

interface SearchParams {
  keyword?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  game_type?: string;
  condition?: string;
  take?: number;
  skip?: number;
}

// 검색 처리 기능
export const searchProducts = async (params: SearchParams) => {
  const where = await getProductSearchCondition(params);

  const products = await db.product.findMany({
    where,
    select: PRODUCT_SELECT,
    take: params.take ?? 10,
    skip: params.skip ?? 0,
    orderBy: { created_at: "desc" },
  });

  return {
    products: products as ProductType[],
    nextCursor: null,
  };
};
