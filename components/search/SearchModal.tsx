/**
 * File Name : components/search/SearchModal
 * Description : 모바일/PC 검색 모달 UI 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.21  임도헌   Created   검색 모달 UI 분리 (PC/모바일 공통)
 * 2026.01.11  임도헌   Modified  모바일 전체화면/데스크톱 드롭다운 분기 및 다크모드 적용
 */

"use client";

import { XMarkIcon } from "@heroicons/react/24/outline";
import SearchBar from "./SearchBar";
import SearchHistoryBox from "./SearchHistoryBox";
import PopularSearchesBox from "./PopularSearchesBox";
import type {
  UserSearchHistoryItem,
  PopularSearchItem,
} from "@/app/(tabs)/products/actions/history";
import { cn } from "@/lib/utils";

interface SearchModalProps {
  isOpen: boolean;
  isMobile: boolean;
  keyword: string | undefined;
  basePath: string;
  searchHistory: UserSearchHistoryItem[];
  popularSearches: PopularSearchItem[];
  onSearch: (keyword: string) => void;
  onClose: () => void;
  onRemoveHistory: (keyword: string) => void;
  onClearHistory: () => void;
}

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

  // controlled value로 전달 (undefined일 경우 빈 문자열)
  const value = keyword ?? "";

  // [모바일 Layout] Full Screen Fixed
  if (isMobile) {
    return (
      <div
        className={cn(
          "fixed inset-0 z-50 flex flex-col animate-fade-in",
          "bg-background" // [Fix] bg-white/dark:bg-neutral-950 -> bg-background
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

  // [Desktop 레이아웃] Dropdown Overlay
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
