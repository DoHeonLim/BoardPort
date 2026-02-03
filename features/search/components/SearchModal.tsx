/**
 * File Name : features/search/components/SearchModal.tsx
 * Description : 모바일/PC 검색 모달 UI 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.21  임도헌   Created   검색 모달 UI 분리 (PC/모바일 공통)
 * 2026.01.11  임도헌   Modified  모바일 전체화면/데스크톱 드롭다운 분기 및 다크모드 적용
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.20  임도헌   Modified  타입 경로 수정 및 Import 정렬
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */
"use client";

import SearchBar from "@/features/search/components/SearchBar";
import SearchHistoryBox from "@/features/search/components/SearchHistoryBox";
import PopularSearchesBox from "@/features/search/components/PopularSearchesBox";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import type {
  SearchHistoryItem,
  PopularSearchItem,
} from "@/features/product/types";

interface SearchModalProps {
  isOpen: boolean;
  isMobile: boolean;
  keyword: string | undefined;
  basePath: string;
  searchHistory: SearchHistoryItem[];
  popularSearches: PopularSearchItem[];
  onSearch: (keyword: string) => void;
  onClose: () => void;
  onRemoveHistory: (keyword: string) => void;
  onClearHistory: () => void;
}

/**
 * 검색 모달 컴포넌트
 *
 * [반응형 레이아웃]
 * - Mobile: 전체 화면(Full Screen)을 덮는 오버레이 형태
 * - Desktop: 검색바 하단에 열리는 드롭다운(Dropdown) 형태
 *
 * [기능]
 * - 검색어 입력 (`SearchBar`)
 * - 최근 검색어 목록 및 관리 (`SearchHistoryBox`)
 * - 인기 검색어 목록 (`PopularSearchesBox`)
 */
export default function SearchModal({
  isOpen,
  isMobile,
  keyword,
  basePath,
  searchHistory,
  popularSearches,
  onSearch,
  onClose,
  onRemoveHistory,
  onClearHistory,
}: SearchModalProps) {
  if (!isOpen) return null;

  const value = keyword ?? "";

  // [Mobile Layout] Full Screen Fixed
  if (isMobile) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col animate-fade-in",
          "bg-background"
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border bg-background shrink-0">
          <button
            onClick={onClose}
            className="p-2 -ml-2 text-muted hover:text-primary transition-colors"
            aria-label="닫기"
          >
            <XMarkIcon className="size-6" />
          </button>
          <SearchBar onSearch={onSearch} value={value} autoFocus />
        </div>

        {/* Content */}
        <div className="bg-background">
          <div className="p-4 flex flex-col gap-8 pb-20">
            <SearchHistoryBox
              history={searchHistory}
              onSearch={onSearch}
              onRemove={onRemoveHistory}
              onClear={onClearHistory}
              basePath={basePath}
              isMobile
            />

            <div className="border-t border-border" />

            <PopularSearchesBox
              popularSearches={popularSearches}
              onSearch={onSearch}
              basePath={basePath}
            />
          </div>
        </div>
      </div>
    );
  }

  // [Desktop Layout] Dropdown Overlay
  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <div className="absolute inset-x-0 top-full bg-surface border-b border-border shadow-lg z-50 rounded-b-2xl">
        <div className="w-full max-w-mobile mx-auto p-6">
          <div className="mb-6">
            <SearchBar
              onSearch={onSearch}
              value={value}
              autoFocus
              className="mx-0"
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <SearchHistoryBox
              history={searchHistory}
              onSearch={onSearch}
              onRemove={onRemoveHistory}
              onClear={onClearHistory}
              basePath={basePath}
            />

            <div className="pl-8 border-l border-border">
              <PopularSearchesBox
                popularSearches={popularSearches}
                onSearch={onSearch}
                basePath={basePath}
              />
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border flex justify-center">
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted hover:text-primary hover:bg-surface-dim rounded-full transition-colors"
            >
              <XMarkIcon className="size-4" /> 닫기
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
