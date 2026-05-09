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
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 카드 헤더의 초소형 타이포 스케일을 단순화
 * 2026.05.03  임도헌   Modified  카테고리 경로가 남는 폭을 활용하도록 고정 max-width 제거
 * 2026.05.04  임도헌   Modified  좁은 상품 카드에서는 카테고리 경로를 숨길 수 있도록 반응형 옵션 추가
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
  hideCategoryOnMobile?: boolean;
}

/**
 * 카드 상단에 게임 타입(보드게임/TRPG 등)과 카테고리 경로를 표시
 * 좁은 화면에서는 부모 카테고리를 숨겨 공간을 확보
 */
export function ProductCardHeader({
  gameType,
  viewMode = "list",
  category,
  hideCategoryOnMobile = false,
}: ProductCardHeaderProps) {
  const isGrid = viewMode === "grid";
  const categoryPath = category
    ? `${category.parent ? `${category.parent.icon ?? ""} ${category.parent.kor_name} > ` : ""}${category.icon ?? ""} ${category.kor_name}`.trim()
    : "";

  return (
    <div
      className={cn(
        "flex min-w-0 max-w-full items-center text-muted",
        isGrid
          ? "gap-1 text-xs sm:gap-1.5"
          : "gap-1.5 text-xs"
      )}
    >
      <span
        className={cn(
          "inline-flex items-center rounded-[4px] font-bold tracking-tight shrink-0",
          "px-1.5 py-0.5 text-xs",
          "bg-brand/10 text-brand dark:bg-brand-light/20 dark:text-gray-100 hover:bg-brand/20 transition-colors"
        )}
      >
        {GAME_TYPE_DISPLAY[gameType as keyof typeof GAME_TYPE_DISPLAY] ||
          gameType}
      </span>

      {category && (
        <>
          <span
            className={cn(
              "shrink-0 text-border dark:text-neutral-700",
              hideCategoryOnMobile && "hidden sm:inline"
            )}
          >
            |
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-muted",
              hideCategoryOnMobile && "hidden sm:block"
            )}
            title={categoryPath}
          >
            {categoryPath}
          </span>
        </>
      )}
    </div>
  );
}
