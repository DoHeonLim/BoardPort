/**
 * File Name : features/product/components/productCard/ProductCardHeader.tsx
 * Description : 게임 타입 및 카테고리 정보를 표시하는 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   게임 타입 및 카테고리 정보 분리 컴포넌트
 * 2026.01.10  임도헌   Modified  시맨틱 클래스 추가
 * 2026.01.12  임도헌   Modified  모바일/좁은 화면에서 부모 카테고리를 렌더링 하지 않게 수정
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.26  임도헌   Modified  게임 타입 UI 수정
 * 2026.03.06  임도헌   Modified  모바일 그리드 카드에서 헤더 정보 밀도와 말줄임 폭을 조정
 */

import { GAME_TYPE_DISPLAY } from "@/features/product/constants";
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/features/product/types";

interface ProductCardHeaderProps {
  gameType: string;
  viewMode?: ViewMode;
  category?: {
    kor_name: string;
    icon: string | null;
    parent?: {
      kor_name: string;
      icon: string | null;
    } | null;
  };
}

/**
 * 카드 상단에 게임 타입(보드게임/TRPG 등)과 카테고리 경로를 표시
 * 좁은 화면에서는 부모 카테고리를 숨겨 공간을 확보
 */
export function ProductCardHeader({
  gameType,
  viewMode = "list",
  category,
}: ProductCardHeaderProps) {
  const isGrid = viewMode === "grid";

  return (
    <div
      className={cn(
        "flex items-center text-muted",
        isGrid ? "gap-1 text-[9px] sm:gap-1.5 sm:text-xs" : "gap-1.5 text-[10px] sm:text-xs"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center rounded-[4px] font-bold tracking-tight shrink-0",
          isGrid ? "px-1.5 py-0.5 text-[9px]" : "px-1.5 py-0.5 text-[9px] sm:text-[10px]",
          "bg-brand/10 text-brand dark:bg-brand-light/20 dark:text-gray-100 hover:bg-brand/20 transition-colors"
        )}
      >
        {GAME_TYPE_DISPLAY[gameType as keyof typeof GAME_TYPE_DISPLAY] ||
          gameType}
      </span>

      {category && (
        <>
          <span className="text-border dark:text-neutral-700">|</span>
          <span
            className={cn(
              "truncate text-muted flex items-center gap-0.5",
              isGrid ? "max-w-[90px] sm:max-w-[140px]" : "max-w-[140px] sm:max-w-none"
            )}
          >
            {/* 부모 카테고리는 sm 이상에서만 노출 */}
            {category.parent && (
              <span className="hidden sm:inline">
                {category.parent.icon} {category.parent.kor_name} &gt;
              </span>
            )}
            {/* 자식 카테고리는 항상 노출 */}
            <span>
              {category.icon} {category.kor_name}
            </span>
          </span>
        </>
      )}
    </div>
  );
}
