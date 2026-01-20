/**
 * File Name : features/search/components/ProductCategoryDropdown.tsx
 * Description : 제품 카테고리 드롭다운 컴포넌트
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
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GAME_TYPE_DISPLAY, GAME_TYPES } from "@/lib/constants";
import { XMarkIcon, ChevronDownIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface CategoryDropdownProps {
  categories: {
    id: number;
    kor_name: string;
    eng_name: string;
    icon: string | null;
    parentId: number | null;
  }[];
  onCategorySelect?: () => void;
}

export default function ProductCategoryDropdown({
  categories,
  onCategorySelect,
}: CategoryDropdownProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryClick = (categoryId: number) => {
    router.push(`/products?category=${categoryId}`);
    setIsOpen(false);
    onCategorySelect?.();
  };

  const handleGameTypeClick = (gameType: string) => {
    router.push(`/products?game_type=${gameType}`);
    setIsOpen(false);
    onCategorySelect?.();
  };

  const topLevelCategories = categories.filter((c) => c.parentId === null);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center justify-center gap-1 h-10 rounded-xl transition-all",
          "bg-brand text-white hover:bg-brand-dark dark:bg-brand-light dark:text-gray-900 dark:hover:bg-brand",
          "shadow-sm active:scale-95 whitespace-nowrap",
          "px-2.5 sm:px-3"
        )}
        aria-label="카테고리 분류 선택"
      >
        <span className="text-lg leading-none">🎲</span>
        <span className="hidden sm:inline text-sm font-bold ml-0.5">분류</span>
        <ChevronDownIcon
          className={cn(
            "hidden sm:block size-4 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className={cn(
              "absolute left-0 top-full mt-2 w-64 rounded-xl shadow-xl z-50 overflow-hidden animate-fade-in origin-top-left",
              "bg-surface border border-border" // [Fix] bg-white -> bg-surface
            )}
          >
            <div className="flex items-center justify-between p-3 border-b border-border bg-surface-dim">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">
                카테고리 선택
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted hover:text-primary transition-colors"
              >
                <XMarkIcon className="size-4" />
              </button>
            </div>

            <div className="p-2 max-h-[400px] overflow-y-auto scrollbar-hide">
              <div className="mb-4">
                <div className="px-2 py-1 text-xs font-semibold text-brand dark:text-brand-light mb-1">
                  게임 타입
                </div>
                {GAME_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleGameTypeClick(type)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-surface-dim rounded-lg transition-colors text-left"
                  >
                    <span className="text-lg grayscale opacity-80">
                      {GAME_TYPE_DISPLAY[type] === "보드게임"
                        ? "🎲"
                        : GAME_TYPE_DISPLAY[type] === "TRPG"
                          ? "🎭"
                          : "🃏"}
                    </span>
                    <span>{GAME_TYPE_DISPLAY[type]}</span>
                  </button>
                ))}
              </div>

              <div>
                <div className="px-2 py-1 text-xs font-semibold text-brand dark:text-brand-light mb-1">
                  장르
                </div>
                {topLevelCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-primary hover:bg-surface-dim rounded-lg transition-colors text-left"
                  >
                    <span className="text-lg grayscale opacity-80">
                      {category.icon}
                    </span>
                    <span>{category.kor_name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
