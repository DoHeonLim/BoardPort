/**
 * File Name : components/providers/SearchProvider
 * Description : 검색 상태 관리 Provider (필터 및 모달 상태)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   검색 필터 및 모달 상태 분리 Provider 생성
 * 2026.01.18  임도헌   Moved     components/providers -> components/global/providers
 * 2026.01.29  임도헌   Modified  주석 정리
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
  useEffect,
} from "react";
import { FilterState } from "@/features/product/types";
import { parseFiltersFromParams } from "@/features/search/utils/parser";

interface SearchProviderProps {
  children: ReactNode;
  searchParams: { [key: string]: string | undefined };
}

interface SearchContextValue {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  isSearchOpen: boolean;
  setIsSearchOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * 검색 및 필터 상태를 전역 관리하는 Provider
 *
 * [기능]
 * 1. URL 쿼리 파라미터(`searchParams`)를 파싱하여 초기 필터 상태를 설정합니다.
 * 2. URL 변경 시 필터 상태를 동기화합니다.
 * 3. 검색 모달의 열림/닫힘 상태(`isSearchOpen`)를 관리합니다.
 */
export function SearchProvider({
  children,
  searchParams,
}: SearchProviderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(
    parseFiltersFromParams(searchParams)
  );

  // URL 파라미터 변경 시 상태 동기화
  useEffect(() => {
    setFilters(parseFiltersFromParams(searchParams));
  }, [searchParams]);

  const value = useMemo(
    () => ({ filters, setFilters, isSearchOpen, setIsSearchOpen }),
    [filters, isSearchOpen]
  );

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  );
}

export function useSearchContext() {
  const context = useContext(SearchContext);
  if (!context)
    throw new Error("useSearchContext must be used within a SearchProvider");
  return context;
}
