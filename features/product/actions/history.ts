/**
 * File Name : features/product/actions/history.ts
 * Description : 제품 검색 기록 Controller
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.29  임도헌   Created
 * 2025.05.29  임도헌   Modified  app/(tabs)/products/actions.ts 파일을 기능별로 분리
 * 2025.05.29  임도헌   Modified  검색 기록 저장/업데이트 기능 분리
 * 2025.06.12  임도헌   Modified  타입 명시 추가
 * 2026.01.12  임도헌   Modified  누락된 인기 검색어 로직 추가
 * 2026.01.20  임도헌   Modified  Service(history.service) 연동
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 * 2026.01.30  임도헌   Moved     app/(tabs)/products/actions/history.ts -> features/product/actions/history.ts
 */

"use server";

import getSession from "@/lib/session";
import {
  saveSearchHistory,
  getUserSearchHistory as fetchUserHistory,
  getPopularSearches as fetchPopular,
  deleteSearchHistory as removeHistory,
  deleteAllSearchHistory as clearHistory,
} from "@/features/product/service/history";
import type { ProductSearchParams } from "@/features/product/types";

/**
 * 단순 검색어 저장 Action
 */
export const createSearchHistory = async (keyword: string) => {
  const session = await getSession();
  const userId = session?.id ?? null;
  await saveSearchHistory(userId, { keyword });
};

/**
 * 검색어 및 필터 조건 저장 Action
 */
export const saveSearchHistoryAction = async (
  userId: number | null,
  params: ProductSearchParams
) => {
  await saveSearchHistory(userId, params);
};

/**
 * 최근 검색어 목록 조회 Action
 */
export const getUserSearchHistory = async () => {
  const session = await getSession();
  if (!session?.id) return [];
  return fetchUserHistory(session.id);
};

/**
 * 인기 검색어 목록 조회 Action
 */
export const getPopularSearches = async () => {
  return fetchPopular();
};

/**
 * 특정 검색 기록 삭제 Action
 */
export const deleteSearchHistory = async (keyword: string) => {
  const session = await getSession();
  if (!session?.id) return;
  await removeHistory(session.id, keyword);
};

/**
 * 검색 기록 전체 삭제 Action
 */
export const deleteAllSearchHistory = async () => {
  const session = await getSession();
  if (!session?.id) return;
  await clearHistory(session.id);
};
