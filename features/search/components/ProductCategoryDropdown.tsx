/**
 * File Name : features/search/components/ProductCategoryDropdown.tsx
 * Description : 제품 카테고리 선택 드롭다운 (검색 섹션 좌측)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.17  임도헌   Created
 * 2024.12.17  임도헌   Modified  제품 카테고리 드롭다운 컴포넌트 생성(카테고리 검색 기능 추가)
 * 2025.04.18  임도헌   Modified  드롭다운 색 수정
 * 2025.04.21  임도헌   Modified  GAME_TYPES를 SEED와 같게 변경
 * 2025.04.29  임도헌   Modified  검색 링크 변경
 * 2025.05.23  임도헌   Modified  카테고리 필드명 변경(name->kor_name)
 * 2025.06.12  임도헌   Modified  카테고리 평탄화
 * 2026.01.11  임도헌   Modified  다크모드 가시성 확보 및 시맨틱 토큰 적용
 * 2026.01.12  임도헌   Modified  height, font size 조정
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.19  임도헌   Modified  카테고리/게임타입 변경 시 기존 region 파라미터 유지
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.03.07  임도헌   Modified  닫기 버튼 접근성을 보강하고 핵심 옵션 노출형 정책과 역할을 분리
 * 2026.03.11  임도헌   Modified  제품 헤더 flat 톤에 맞춰 neutral tone 및 compact 버튼 밀도 분기 반영
 * 2026.03.12  임도헌   Modified  헤더 분류 버튼, 드롭다운, OTHER 예외 흐름 명확화
 * 2026.03.12  임도헌   Modified  제품 분류 드롭다운 외곽선을 border-border-subtle 기준으로 통일
 * 2026.03.18  임도헌   Modified  빠른 분류는 새 탐색 시작 역할로 정리하고 기존 검색/세부 필터 초기화
 * 2026.03.28  임도헌   Modified  모바일 제품 헤더 터치 문법에 맞춰 카테고리 선택을 Bottom Sheet로 통일
 * 2026.04.02  임도헌   Modified  카테고리 옵션/빠른 분류 키 타입을 search 도메인 공용 타입 기준으로 정리
 * 2026.04.10  임도헌   Modified  검색 타이포 정책에 맞춰 분류 라벨 및 섹션 헤더 weight를 500 기준으로 정리
 */
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GAME_TYPE_DISPLAY, GAME_TYPES } from "@/features/product/constants";
import BottomSheet from "@/components/global/BottomSheet";
import type {
  ProductQuickCategoryParamKey,
  ProductSearchCategoryOption,
} from "@/features/search/types";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";

interface CategoryDropdownProps {
  categories: ProductSearchCategoryOption[];
  onCategorySelect?: () => void;
  compact?: boolean;
  tone?: "default" | "neutral";
}

/**
 * 검색바 좌측의 카테고리 빠른 선택 드롭다운
 * - 게임 타입(보드게임/TRPG/카드) 및 대분류 카테고리를 바로 선택하여 이동
 * - `compact`, `tone` props로 헤더 버튼 밀도와 flat 톤을 분기
 * - 빠른 분류 선택 시 기존 검색어/가격/상태 조건은 비우고 분류 축만 남김
 */
export default function ProductCategoryDropdown({
  categories,
  onCategorySelect,
  compact = false,
  tone = "default",
}: CategoryDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  /**
   * 빠른 분류 전용 쿼리 재구성
   * - 기존 검색어/가격/상태 조건 초기화
   * - 선택한 분류 축만 유지
   */
  const createQuickCategoryQuery = (
    name: ProductQuickCategoryParamKey,
    value: string
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    // 세부 검색 조건 초기화
    [
      "keyword",
      "minPrice",
      "maxPrice",
      "condition",
      "category",
      "game_type",
    ].forEach((key) => params.delete(key));
    params.set(name, value);

    return params.toString();
  };

  const handleCategoryClick = (categoryId: number) => {
    const query = createQuickCategoryQuery("category", String(categoryId));
    router.push(`/products?${query}`);
    setIsOpen(false);
    onCategorySelect?.();
  };

  const handleGameTypeClick = (gameType: string) => {
    const query = createQuickCategoryQuery("game_type", gameType);
    router.push(`/products?${query}`);
    setIsOpen(false);
    onCategorySelect?.();
  };

  const topLevelCategories = categories.filter((c) => c.parentId === null);
  const categoryListContent = (
    <>
      <div className="mb-4">
        <div className="mb-1 rounded-md bg-brand/5 px-2 py-1.5 text-xs font-medium text-brand dark:bg-brand-light/10 dark:text-brand-light">
          게임 타입
        </div>
        {GAME_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => handleGameTypeClick(type)}
            className="focus-ring-soft w-full rounded-lg px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-surface-dim"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg opacity-80 grayscale">
                {GAME_TYPE_DISPLAY[type] === "보드게임"
                  ? "🎲"
                  : GAME_TYPE_DISPLAY[type] === "TRPG"
                    ? "🎭"
                    : "🃏"}
              </span>
              <span>{GAME_TYPE_DISPLAY[type]}</span>
            </span>
          </button>
        ))}
      </div>

      <div>
        <div className="mb-1 rounded-md bg-brand/5 px-2 py-1.5 text-xs font-medium text-brand dark:bg-brand-light/10 dark:text-brand-light">
          장르
        </div>
        {topLevelCategories.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategoryClick(category.id)}
            className="focus-ring-soft w-full rounded-lg px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-surface-dim"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg opacity-80 grayscale">
                {category.icon}
              </span>
              <span>{category.kor_name}</span>
            </span>
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "focus-ring-soft",
          "flex items-center justify-center gap-1 rounded-xl transition-[background-color,color,border-color,box-shadow] border",
          tone === "neutral"
            ? "bg-surface-dim text-primary border-border-strong hover:bg-surface"
            : "bg-brand text-white border-brand hover:bg-brand-dark",
          tone === "default" &&
            "dark:bg-brand-dark dark:text-brand-light dark:border-brand-light/30 dark:hover:bg-brand-dark/80",
          "shadow-sm active:scale-95 whitespace-nowrap",
          compact ? "h-9 px-2.5 sm:h-10 sm:px-3" : "h-10 px-2.5 sm:px-3"
        )}
        aria-label="카테고리 분류 선택"
      >
        <span
          className={cn(
            "leading-none",
            compact ? "text-base sm:text-lg" : "text-lg"
          )}
        >
          🎲
        </span>
        <span
          className={cn(
            "ml-0.5 text-sm font-medium",
            compact ? "hidden sm:inline" : "hidden sm:inline"
          )}
        >
          분류
        </span>
        <ChevronDownIcon
          className={cn(
            compact
              ? "size-3 transition-transform sm:size-4"
              : "hidden sm:block size-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isMobile ? (
        <BottomSheet
          open={isOpen}
          title="카테고리 선택"
          description="게임 타입과 장르를 빠르게 선택해 새 탐색을 시작합니다."
          onClose={() => setIsOpen(false)}
          contentClassName="pt-4"
        >
          {categoryListContent}
        </BottomSheet>
      ) : (
        isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div
              className={cn(
                "absolute left-0 top-full mt-2 w-64 rounded-xl shadow-xl z-50 overflow-hidden origin-top-left",
                "bg-surface border border-border-subtle"
              )}
            >
              <div className="flex items-center justify-between border-b border-border-subtle bg-surface-dim p-3">
                <span className="text-xs font-medium uppercase tracking-wider text-muted">
                  카테고리 선택
                </span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="focus-ring-soft rounded p-0.5 text-muted transition-colors hover:text-primary"
                  aria-label="카테고리 선택 닫기"
                >
                  <XMarkIcon className="size-4" />
                </button>
              </div>

              <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-hide">
                {categoryListContent}
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
