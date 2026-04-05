/**
 * File Name : features/product/service/category.ts
 * Description : 제품 카테고리 조회 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Moved     lib/categories.ts -> features/product/service/category.ts
 * 2026.03.04  임도헌   Modified  카테고리 캐싱 적용
 * 2026.03.09  임도헌   Modified  시드 순서를 유지하도록 id 기준 정렬로 변경
 * 2026.04.02  임도헌   Modified  카테고리 조회 서비스 JSDoc 보강
 */
import "server-only";
import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";

/**
 * 제품 카테고리 목록 가져오기
 * - 시드 생성 순서를 유지하기 위해 parentId, id 기준으로 정렬
 * - nextCache와 PRODUCT_CATEGORIES 태그를 사용해 서버 캐시 적용
 */
export const fetchProductCategories = nextCache(
  async () => {
    return await db.category.findMany({
      orderBy: [{ parentId: "asc" }, { id: "asc" }],
    });
  },
  ["product-categories"],
  { tags: [T.PRODUCT_CATEGORIES()], revalidate: 86400 } // 24시간 캐시
);
