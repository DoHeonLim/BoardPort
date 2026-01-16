/**
 * File Name : components/product/ProductCardTitle
 * Description : 제품 제목
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   제품 제목 전용 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  viewmode 기반의 동적인 line clamp 추가
 */
import { cn } from "@/lib/utils";

interface ProductCardTitleProps {
  title: string;
  viewMode: "grid" | "list";
}

export function ProductCardTitle({ title, viewMode }: ProductCardTitleProps) {
  return (
    <h3
      className={cn(
        "font-semibold text-primary transition-colors group-hover:text-brand dark:group-hover:text-brand-light",
        "text-sm sm:text-base",
        viewMode === "grid" ? "line-clamp-2" : "line-clamp-1"
      )}
      title={title}
    >
      {title}
    </h3>
  );
}
