/**
 * File Name : features/search/components/SearchFilters.tsx
 * Description : 검색 필터 모음 (모바일 Bottom Sheet / 데스크톱 Dropdown)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.17  임도헌   Created   검색 필터 컴포넌트 생성
 * 2025.04.18  임도헌   Modified  모바일일때는 고정위치, PC일때는 절대 위치로 변경
 * 2025.04.30  임도헌   Modified  성능 최적화 및 사용자 경험 개선
 * 2025.06.12  임도헌   Modified  카테고리 평탄화
 * 2025.06.18  임도헌   Modified  useSearchParamsUtils 활용해 URL 갱신 통합
 * 2025.06.18  임도헌   Modified  각 필터 컴포넌트 분리
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 및 다크모드 배경색(bg-surface) 적용
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 */
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { Category } from "@/generated/prisma/client";
import { FilterState } from "@/lib/constants";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSearchParamsUtils } from "@/features/search/hooks/useSearchParamsUtils";
import CategoryFilter from "@/features/search/components/filters/CategoryFilter";
import PriceFilter from "@/features/search/components/filters/PriceFilter";
import GameTypeFilter from "@/features/search/components/filters/GameTypeFilter";
import ConditionFilter from "@/features/search/components/filters/ConditionFilter";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface SearchFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  filters: FilterState;
}

export default function SearchFilters({
  isOpen,
  onClose,
  categories,
  filters,
}: SearchFiltersProps) {
  const { buildSearchParams } = useSearchParamsUtils();

  const [tempFilters, setTempFilters] = useState<FilterState>(filters);
  const [selectedParentCategory, setSelectedParentCategory] =
    useState<string>("");

  const wrapperRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // 외부 클릭 닫기 (데스크톱만)
  useEffect(() => {
    if (isMobile) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose, isMobile]);

  // 필터 props 변경 시 로컬 상태 동기화
  useEffect(() => {
    setTempFilters(filters);
  }, [filters]);

  const handleParentCategoryChange = useCallback((value: string) => {
    setSelectedParentCategory(value);
    setTempFilters((prev) => ({ ...prev, category: value }));
  }, []);

  const handleChildCategoryChange = useCallback((value: string) => {
    setTempFilters((prev) => ({ ...prev, category: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    buildSearchParams(tempFilters);
    onClose();
  }, [tempFilters, buildSearchParams, onClose]);

  const handleResetFilters = useCallback(() => {
    const resetFilters: FilterState = {
      category: "",
      minPrice: "",
      maxPrice: "",
      game_type: "",
      condition: "",
    };
    setTempFilters(resetFilters);
    setSelectedParentCategory("");
  }, []);

  const handlePriceChange = useCallback(
    (key: "minPrice" | "maxPrice", value: string) => {
      const numValue =
        value === "" ? "" : Math.max(0, parseInt(value)).toString();
      setTempFilters((prev) => ({ ...prev, [key]: numValue }));
    },
    []
  );

  const parentCategories = useMemo(
    () => categories.filter((c) => c.parentId === null),
    [categories]
  );
  const childCategories = useMemo(
    () =>
      categories.filter(
        (c) => c.parentId?.toString() === selectedParentCategory
      ),
    [categories, selectedParentCategory]
  );

  if (!isOpen) return null;

  return (
    <div className="relative z-50">
      {/* [Mobile] 바텀시트 / 전체화면 Overlay */}
      <div className="md:hidden fixed inset-0 z-50">
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
        <div className="absolute bottom-0 inset-x-0 bg-surface rounded-t-2xl max-h-[85vh] h-full flex flex-col animate-slide-up shadow-2xl">
          {/* Header */}
          <div className="flex justify-between items-center p-5 border-b border-border">
            <h3 className="text-lg font-bold text-primary">필터 설정</h3>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-muted hover:text-primary transition-colors rounded-full hover:bg-surface-dim"
              aria-label="닫기"
            >
              <XMarkIcon className="size-6" />
            </button>
          </div>

          {/* Content (스크롤) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-8 pb-safe">
            <CategoryFilter
              parentCategories={parentCategories}
              childCategories={childCategories}
              selectedParentCategory={selectedParentCategory}
              onParentChange={handleParentCategoryChange}
              selectedChildCategory={tempFilters.category ?? ""}
              onChildChange={handleChildCategoryChange}
            />

            <div className="space-y-6">
              <PriceFilter
                minPrice={tempFilters.minPrice ?? ""}
                maxPrice={tempFilters.maxPrice ?? ""}
                onChangeKeyValue={handlePriceChange}
              />
              <GameTypeFilter
                value={tempFilters.game_type ?? ""}
                onChange={(value) =>
                  setTempFilters((prev) => ({ ...prev, game_type: value }))
                }
              />
              <ConditionFilter
                value={tempFilters.condition ?? ""}
                onChange={(value) =>
                  setTempFilters((prev) => ({ ...prev, condition: value }))
                }
              />
            </div>
          </div>

          {/* Footer (액션) */}
          <div className="flex gap-3 p-5 border-t border-border bg-surface safe-area-pb">
            <button
              onClick={handleResetFilters}
              className="flex-1 btn-secondary h-12 text-sm"
            >
              초기화
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 btn-primary h-12 text-sm"
            >
              적용하기
            </button>
          </div>
        </div>
      </div>

      {/* [Desktop] 드롭다운 */}
      <div className="hidden md:block absolute top-full right-0 mt-2 w-80 z-50 origin-top-right">
        <div
          ref={wrapperRef}
          className="bg-surface rounded-xl shadow-xl border border-border overflow-hidden animate-fade-in"
        >
          <div className="flex justify-between items-center px-4 py-3 border-b border-border bg-surface-dim">
            <h3 className="font-semibold text-primary">상세 필터</h3>
            <button
              onClick={onClose}
              className="text-muted hover:text-primary transition-colors"
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>

          <div className="p-5 space-y-6 max-h-[60vh] overflow-y-auto scrollbar-hide">
            <CategoryFilter
              parentCategories={parentCategories}
              childCategories={childCategories}
              selectedParentCategory={selectedParentCategory}
              onParentChange={handleParentCategoryChange}
              selectedChildCategory={tempFilters.category ?? ""}
              onChildChange={handleChildCategoryChange}
            />
            <PriceFilter
              minPrice={tempFilters.minPrice ?? ""}
              maxPrice={tempFilters.maxPrice ?? ""}
              onChangeKeyValue={handlePriceChange}
            />
            <div className="grid grid-cols-1 gap-4">
              <GameTypeFilter
                value={tempFilters.game_type ?? ""}
                onChange={(value) =>
                  setTempFilters((prev) => ({ ...prev, game_type: value }))
                }
              />
              <ConditionFilter
                value={tempFilters.condition ?? ""}
                onChange={(value) =>
                  setTempFilters((prev) => ({ ...prev, condition: value }))
                }
              />
            </div>
          </div>

          <div className="p-4 border-t border-border flex gap-3 bg-surface-dim">
            <button
              onClick={handleResetFilters}
              className="flex-1 btn-secondary text-xs h-9"
            >
              초기화
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 btn-primary text-xs h-9"
            >
              적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
