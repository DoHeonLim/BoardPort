/**
 * File Name : features/stream/service/category.ts
 * Description : 스트리밍 카테고리 조회 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Moved     lib/categories.ts -> features/stream/service/category.ts
 * 2026.03.04  임도헌   Modified  카테고리 캐싱 적용
 * 2026.03.09  임도헌   Modified  시드 순서를 유지하도록 id 기준 정렬로 변경
 * 2026.04.02  임도헌   Modified  카테고리 조회 캐시 래퍼 설명 보강
 */
import "server-only";
import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";

/**
 * 스트리밍 카테고리 목록 가져오기
 * - 시드 생성 순서를 유지하기 위해 parentId, id 기준으로 정렬
 * - `nextCache` 래퍼를 통해 하루 단위 서버 캐시를 적용
 */
export const fetchStreamCategories = nextCache(
  async () => {
    return await db.streamCategory.findMany({
      orderBy: [{ parentId: "asc" }, { id: "asc" }],
    });
  },
  ["stream-categories"],
  { tags: [T.STREAM_CATEGORIES()], revalidate: 86400 }
);
