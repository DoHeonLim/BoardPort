/**
 * File Name : features/stream/service/category.ts
 * Description : 스트리밍 카테고리 조회 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.30  임도헌   Moved     lib/categories.ts -> features/stream/service/category.ts
 * 2026.03.04  임도헌   Modified  카테고리 캐싱 적용
 */
import "server-only";
import db from "@/lib/db";
import { unstable_cache as nextCache } from "next/cache";
import * as T from "@/lib/cacheTags";

/**
 * 스트리밍 카테고리 목록 가져오기 (한글 이름 오름차순)
 */
export const fetchStreamCategories = nextCache(
  async () => {
    return await db.streamCategory.findMany({
      orderBy: { kor_name: "asc" },
    });
  },
  ["stream-categories"],
  { tags: [T.STREAM_CATEGORIES()], revalidate: 86400 }
);
