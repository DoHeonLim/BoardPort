"use client";

/**
 * File Name : features/product/hooks/useProductHeaderState.ts
 * Description : 제품 목록 헤더 공통 상태/이벤트 관리 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.13  임도헌   Created   모바일/데스크톱 제품 헤더에서 중복되던 검색/필터 상태 로직을 공통 훅으로 분리
 * 2026.04.17  임도헌   Modified  공통 헤더 훅의 검색/필터/최근 검색어 책임이 주석에서 바로 드러나도록 설명 보강
 */

import { useState } from "react";
import { useSearchHistory } from "@/features/search/hooks/useSearchHistory";
import { useSearchParamsUtils } from "@/features/search/hooks/useSearchParamsUtils";
import { getProductHeaderSummary } from "@/features/product/utils/getProductHeaderSummary";
import type { SearchHistoryItem } from "@/features/search/types";
import type { Category } from "@/generated/prisma/client";
import type { FilterState } from "@/features/product/types";

interface UseProductHeaderStateParams {
  categories: Category[];
  filters: FilterState;
  keyword?: string;
  searchHistory: SearchHistoryItem[];
}

/**
 * 제품 목록 모바일/데스크톱 헤더가 공유하는 상태 조립 훅
 *
 * - 검색 모달 열림 상태를 한 곳에서 관리
 * - 최근 검색어 저장/삭제/전체 비우기 흐름을 `useSearchHistory`와 연결
 * - 현재 filters/keyword 기준 요약 문구와 활성 필터 여부를 계산
 * - 실제 검색 실행 시 검색어 갱신과 모달 닫힘을 같은 핸들러로 묶는다
 */
export function useProductHeaderState({
  categories,
  filters,
  keyword,
  searchHistory,
}: UseProductHeaderStateParams) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const { resetFilterParams, updateKeyword } = useSearchParamsUtils();
  const {
    history: localSearchHistory,
    addHistory,
    removeHistory,
    clearHistory,
  } = useSearchHistory(searchHistory);

  // 모바일/데스크톱 헤더 간 동일 기준의 필터 요약 문구 공유
  const { summary: filterSummary, activeFilterCount } = getProductHeaderSummary(
    {
      categories,
      filters,
      keyword,
    }
  );

  // 검색 확정 시 최근 검색어 저장, URL keyword 갱신 후 모달 닫기
  const handleSearch = (nextKeyword: string) => {
    addHistory(nextKeyword);
    updateKeyword(nextKeyword);
    setIsSearchOpen(false);
  };

  return {
    isSearchOpen,
    setIsSearchOpen,
    handleSearch,
    filterSummary,
    hasActiveFilters: activeFilterCount > 0,
    resetFilterParams,
    localSearchHistory,
    removeHistory,
    clearHistory,
  };
}
