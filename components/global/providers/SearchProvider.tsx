/**
 * File Name : components/providers/SearchProvider
 * Description : 검색 상태를 관리하는 Context Provider
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.26  임도헌   Created   검색 필터 및 모달 상태 분리 Provider 생성
 * 2026.01.18  임도헌   Moved     components/providers -> components/global/providers
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
import { FilterState } from "@/lib/constants";
import { parseFiltersFromParams } from "@/features/search/lib/parseFiltersFromParams";

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

export function SearchProvider({
  children,
  searchParams,
}: SearchProviderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(
    parseFiltersFromParams(searchParams)
  );

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
