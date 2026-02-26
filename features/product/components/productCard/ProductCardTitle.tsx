/**
 * File Name : features/product/components/productCard/ProductCardTitle.tsx
 * Description : 제품 제목
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   제품 제목 전용 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  viewmode 기반의 동적인 line clamp 추가
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.26  임도헌   Modified  Grid 모드일 때 최소 높이(min-h)를 강제
 */
import { cn } from "@/lib/utils";
import type { ViewMode } from "@/features/product/types";

interface ProductCardTitleProps {
  title: string;
  viewMode: ViewMode;
}

/**
 * 제품 제목을 표시
 * - Grid View: 최대 2줄 표시 (line-clamp-2)
 * - List View: 최대 1줄 표시 (line-clamp-1)
 */
export function ProductCardTitle({ title, viewMode }: ProductCardTitleProps) {
  return (
    <h3
      className={cn(
        "font-semibold text-primary transition-colors group-hover:text-brand dark:group-hover:text-brand-light text-sm sm:text-base",
        viewMode === "grid" ? "line-clamp-2 min-h-[2.5rem]" : "line-clamp-1"
      )}
      title={title}
    >
      {title}
    </h3>
  );
}
