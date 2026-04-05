/**
 * File Name : features/search/constants.ts
 * Description : 검색 도메인 공용 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.02  임도헌   Created   검색 기록/필터/롱프레스 정책 상수 분리
 */

import type { SearchFilterKey } from "@/features/search/types";

/** 검색 기록 최대 보관 개수 */
export const SEARCH_HISTORY_MAX_ITEMS = 5;

/** 검색 필터 키 목록 */
export const SEARCH_FILTER_KEYS: SearchFilterKey[] = [
  "category",
  "minPrice",
  "maxPrice",
  "game_type",
  "condition",
];

/** 게시글 카테고리 탭 롱프레스 기준 시간(ms) */
export const SEARCH_TAB_TOOLTIP_LONG_PRESS_MS = 600;
