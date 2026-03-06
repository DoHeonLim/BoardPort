/**
 * File Name : features/product/components/productCard/ProductCardTags.tsx
 * Description : 제품 태그 목록 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   태그 리스트 컴포넌트로 분리
 * 2025.01.10  임도헌   Modified  태그 갯수 제한(3개)
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.03.06  임도헌   Modified  리스트 카드 밀도에 맞춰 최대 노출 태그 수를 prop으로 제어 가능하게 확장
 */

import { cn } from "@/lib/utils";
import type { ProductTag } from "@/features/product/types";

interface ProductCardTagsProps {
  tags: ProductTag[];
  maxTags?: number;
}

/**
 * 제품 태그를 뱃지 형태로 표시
 * 최대 3개까지만 보여주고 나머지는 "+N"으로 축약
 */
export function ProductCardTags({
  tags,
  maxTags = 3,
}: ProductCardTagsProps) {
  if (!tags || tags.length === 0) return null;

  const displayTags = tags.slice(0, maxTags);
  const moreCount = Math.max(0, tags.length - maxTags);

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
