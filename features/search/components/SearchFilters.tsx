/**
 * File Name : features/search/components/SearchFilters.tsx
 * Description : 검색 상세 필터 UI (카테고리, 가격, 상태 등)
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
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.06  임도헌   Modified  모바일 옵션 메뉴를 Bottom Sheet 패턴으로 통일하고 드래그 닫기 UX를 적용
 * 2026.03.09  임도헌   Modified  자식이 없는 대분류(기타) 선택 시 소분류 필터 숨김 처리
 * 2026.03.09  임도헌   Modified  기존 category 필터가 있을 때 대분류 선택 상태를 복원하도록 동기화
 * 2026.03.11  임도헌   Modified  flat 헤더 필터 버튼과 맞물리도록 desktop dropdown / mobile sheet 이원 구조 정리
 * 2026.03.14  임도헌   Modified  필터 적용은 검색어를 유지하고 시트 내부 초기화는 임시 선택값만 되돌리도록 UX를 분리
 * 2026.03.23  임도헌   Modified  데스크톱 드롭다운을 최근 필터/모달 톤에 맞춰 subtle 보더와 surface 헤더/푸터 기준으로 정리
 * 2026.03.28  임도헌   Modified  제품 검색의 다크 유틸리티 맥락에 맞춰 적용 버튼을 quiet-dark primary로 정규화
 * 2026.04.02  임도헌   Modified  검색 필터 타입 import를 search 도메인 공용 타입 기준으로 정리
 */
"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { Category } from "@/generated/prisma/client";
import BottomSheet from "@/components/global/BottomSheet";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSearchParamsUtils } from "@/features/search/hooks/useSearchParamsUtils";
import type { SearchFilterValues } from "@/features/search/types";
import CategoryFilter from "@/features/search/components/filters/CategoryFilter";
import PriceFilter from "@/features/search/components/filters/PriceFilter";
import GameTypeFilter from "@/features/search/components/filters/GameTypeFilter";
import ConditionFilter from "@/features/search/components/filters/ConditionFilter";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface SearchFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  filters: SearchFilterValues;
}

/**
 * 상세 필터 설정 컴포넌트
 *
 * [반응형 레이아웃]
 * - Mobile: 하단 Bottom Sheet 스타일
 * - Desktop: 필터 버튼 하단 Dropdown 스타일
 *
 * [기능]
 * - 임시 필터 상태(`tempFilters`)를 관리하며, '적용' 버튼 클릭 시 URL에 반영
 * - 시트 내부 '초기화' 버튼은 임시 선택값만 리셋하고 URL은 유지
 * - 기존 category 필터가 있으면 대분류 선택 상태를 역추적해 복원
 */
export default function SearchFilters({
  isOpen,
  onClose,
  categories,
  filters,
}: SearchFiltersProps) {
  const { applyFilterParams } = useSearchParamsUtils();

  const [tempFilters, setTempFilters] = useState<SearchFilterValues>(filters);
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

  useEffect(() => {
    if (!filters.category) {
      setSelectedParentCategory("");
      return;
    }

    const selectedCategory = categories.find(
      (category) => String(category.id) === filters.category
    );

    if (!selectedCategory) {
      setSelectedParentCategory("");
      return;
    }

    setSelectedParentCategory(
      String(selectedCategory.parentId ?? selectedCategory.id)
    );
  }, [categories, filters.category]);

  const handleParentCategoryChange = useCallback((value: string) => {
    setSelectedParentCategory(value);
    setTempFilters((prev) => ({ ...prev, category: value }));
  }, []);

  const handleChildCategoryChange = useCallback((value: string) => {
    setTempFilters((prev) => ({ ...prev, category: value }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    applyFilterParams(tempFilters);
    onClose();
  }, [tempFilters, applyFilterParams, onClose]);

  const handleResetFilters = useCallback(() => {
    const resetFilters: SearchFilterValues = {
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
        value === "" ? "" : Math.max(0, parseInt(value, 10)).toString();
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
  const hasChildCategories = childCategories.length > 0;

  if (!isOpen) return null;

  return (
    <div className="relative z-50">
      <BottomSheet
        open={isMobile && isOpen}
        title="필터 설정"
        description="카테고리, 가격, 상태 조건을 설정할 수 있습니다."
        onClose={onClose}
        contentClassName="space-y-4 pt-4"
        footer={
          <div className="flex gap-3">
            <button
              onClick={handleResetFilters}
              className="flex-1 btn-secondary h-12 text-sm"
            >
              초기화
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 btn-primary-quiet-dark h-12 text-sm"
            >
              적용하기
            </button>
          </div>
        }
      >
        <CategoryFilter
          parentCategories={parentCategories}
          childCategories={childCategories}
          hasChildCategories={hasChildCategories}
          selectedParentCategory={selectedParentCategory}
          onParentChange={handleParentCategoryChange}
          selectedChildCategory={tempFilters.category ?? ""}
          onChildChange={handleChildCategoryChange}
        />

        <div className="space-y-4">
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
      </BottomSheet>

      {/* [Desktop] 드롭다운 */}
      <div className="hidden md:block absolute top-full right-0 mt-2 w-80 z-50 origin-top-right">
        <div
          ref={wrapperRef}
          className="overflow-hidden rounded-xl border border-border-subtle bg-surface shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border-subtle bg-surface px-4 py-3">
            <h3 className="font-semibold text-primary">상세 필터</h3>
            <button
              onClick={onClose}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-primary"
              aria-label="필터 닫기"
            >
              <XMarkIcon className="size-5" />
            </button>
          </div>

          <div className="max-h-[60dvh] space-y-4 overflow-y-auto p-5 scrollbar-hide">
            <CategoryFilter
              parentCategories={parentCategories}
              childCategories={childCategories}
              hasChildCategories={hasChildCategories}
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

          <div className="flex gap-3 border-t border-border-subtle bg-surface p-4">
            <button
              onClick={handleResetFilters}
              className="flex-1 btn-secondary text-xs h-9"
            >
              초기화
            </button>
            <button
              onClick={handleApplyFilters}
              className="flex-1 btn-primary-quiet-dark text-xs h-9"
            >
              적용
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
