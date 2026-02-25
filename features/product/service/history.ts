/**
 * File Name : features/product/service/history.ts
 * Description : 검색 기록 및 인기 검색어 서비스
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.29  임도헌   Created
 * 2025.05.29  임도헌   Modified  app/(tabs)/products/actions.ts 파일을 기능별로 분리
 * 2025.05.29  임도헌   Modified  검색 기록 저장/업데이트 기능 분리
 * 2025.06.12  임도헌   Modified  타입 명시 추가
 * 2026.01.12  임도헌   Modified  누락된 인기 검색어 로직 추가
 * 2026.01.20  임도헌   Modified  app/actions/history -> service/history
 * 2026.01.25  임도헌   Modified  주석 보강
 * 2026.02.22  임도헌   Modified  검색어 대소문자 정규화(toLowerCase) 적용으로 파편화 방지
 */

import "server-only";
import db from "@/lib/db";
import type {
  SearchHistoryItem,
  PopularSearchItem,
  ProductSearchParams,
} from "@/features/product/types";

/**
 * 검색 기록 저장 및 인기 검색어 카운트 증가를 수행
 * - 로그인 유저: 개인 검색 기록(SearchHistory) 저장/갱신 (최신순 정렬)
 * - 전체: 인기 검색어(PopularSearch) 카운트 증가 (Upsert)
 *
 * @param {number | null} userId - 유저 ID (비로그인 시 null)
 * @param {ProductSearchParams} params - 검색 파라미터 (keyword 포함)
 */
export async function saveSearchHistory(
  userId: number | null,
  params: ProductSearchParams
) {
  const keyword = params.keyword?.trim().toLowerCase();
  if (!keyword) return;

  // 1. 개인 검색 기록 저장 (로그인 유저만)
  if (userId) {
    const existing = await db.searchHistory.findFirst({
      where: { userId, keyword },
    });

    if (existing) {
      // 이미 검색한 키워드라면 updated_at 갱신하여 최신으로 올림
      await db.searchHistory.update({
        where: { id: existing.id },
        data: { updated_at: new Date() },
      });
    } else {
      // 새로운 키워드라면 추가 (필터 조건 포함)
      await db.searchHistory.create({
        data: {
          userId,
          keyword,
          category: params.category,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          game_type: params.game_type,
          condition: params.condition,
        },
      });
    }
  }

  // 2. 인기 검색어 집계 (비로그인 유저 포함)
  // - 동시성 이슈 발생 시 무시 (try-catch)
  try {
    await db.popularSearch.upsert({
      where: { keyword },
      update: { count: { increment: 1 }, updated_at: new Date() },
      create: { keyword, count: 1 },
    });
  } catch (e) {
    console.error("Popular search update failed:", e);
  }
}

/**
 * 유저의 최근 검색 기록 조회 (최대 5개)
 *
 * @param {number} userId - 유저 ID
 * @returns {Promise<SearchHistoryItem[]>} 최근 검색어 목록
 */
export async function getUserSearchHistory(
  userId: number
): Promise<SearchHistoryItem[]> {
  return db.searchHistory.findMany({
    where: { userId },
    select: { keyword: true, created_at: true },
    orderBy: { updated_at: "desc" },
    take: 5,
  });
}

/**
 * 인기 검색어 조회 (최대 5개)
 *
 * @returns {Promise<PopularSearchItem[]>} 인기 검색어 목록
 */
export async function getPopularSearches(): Promise<PopularSearchItem[]> {
  return db.popularSearch.findMany({
    select: { keyword: true, count: true },
    orderBy: { count: "desc" },
    take: 5,
  });
}

/**
 * 특정 검색 기록 삭제
 *
 * @param {number} userId - 유저 ID
 * @param {string} keyword - 삭제할 키워드
 */
export async function deleteSearchHistory(userId: number, keyword: string) {
  await db.searchHistory.deleteMany({ where: { userId, keyword } });
}

/**
 * 검색 기록 전체 삭제
 *
 * @param {number} userId - 유저 ID
 */
export async function deleteAllSearchHistory(userId: number) {
  await db.searchHistory.deleteMany({ where: { userId } });
}
