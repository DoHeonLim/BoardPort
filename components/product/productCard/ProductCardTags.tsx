/**
 * File Name : components/product/ProductCardTags
 * Description : 제품 태그 목록 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   태그 리스트 컴포넌트로 분리
 * 2025.01.10  임도헌   Modified  태그 갯수 제한(3개)
 */

import { cn } from "@/lib/utils";

interface ProductCardTagsProps {
  tags: { name: string }[];
}

export function ProductCardTags({ tags }: ProductCardTagsProps) {
  if (!tags || tags.length === 0) return null;

  const displayTags = tags.slice(0, 3);
  const moreCount = tags.length - 3;

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayTags.map((tag, index) => (
        <span
          key={index}
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium",
            "bg-badge text-badge-text border border-transparent dark:border-white/10"
          )}
        >
          🏷️{tag.name}
        </span>
      ))}
      {moreCount > 0 && (
        <span className="text-[10px] text-muted self-center">+{moreCount}</span>
      )}
    </div>
  );
}
