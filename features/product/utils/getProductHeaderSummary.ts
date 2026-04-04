/**
 * File Name : features/product/utils/getProductHeaderSummary.ts
 * Description : 제품 헤더용 필터 요약 문자열 생성 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.10  임도헌   Created   모바일/데스크톱 제품 헤더에서 공통으로 사용하는 필터 요약 문자열 생성 유틸 추가
 * 2026.03.11  임도헌   Modified  가격/상태 필터를 포함한 헤더 요약 문자열 규칙으로 확장
 */

import { CONDITION_DISPLAY } from "@/features/product/constants";
import { formatSearchSummary } from "@/features/product/utils/format";
import { getCategoryName } from "@/lib/getCategoryName";
import { formatToWon } from "@/lib/utils";
import type { Category } from "@/generated/prisma/client";
import type { FilterState } from "@/features/product/types";

interface Params {
  categories: Category[];
  filters: FilterState;
  keyword?: string;
}

/**
 * 제품 헤더 필터 요약 문자열 생성
 * - 카테고리/게임 타입/검색어 우선 노출
 * - 가격/상태는 보조 요약으로 결합
 */
export function getProductHeaderSummary({
  categories,
  filters,
  keyword,
}: Params) {
  const activeFilterCount = [
    filters.category,
    filters.game_type,
    filters.condition,
    filters.minPrice,
    filters.maxPrice,
  ].filter(Boolean).length;

  const categoryName = filters.category
    ? getCategoryName(filters.category, categories)
    : "";

  const selectionSummary = formatSearchSummary(
    categoryName,
    filters.game_type,
    keyword
  );

  const extraFilterLabels: string[] = [];
  if (filters.minPrice || filters.maxPrice) {
    const priceLabel = `가격: ${formatToWon(Number(filters.minPrice || 0))}원 ~ ${
      filters.maxPrice ? `${formatToWon(Number(filters.maxPrice))}원` : "∞"
    }`;
    extraFilterLabels.push(priceLabel);
  }
  if (filters.condition) {
    extraFilterLabels.push(
      `상태: ${
        CONDITION_DISPLAY[
          filters.condition as keyof typeof CONDITION_DISPLAY
        ]
      }`
    );
  }

  const extraSummary =
    extraFilterLabels.length === 0
      ? ""
      : extraFilterLabels.length <= 2
      ? ` + ${extraFilterLabels.join(", ")}`
      : ` + ${extraFilterLabels.length}개`;

  const summary =
    selectionSummary
      ? `${selectionSummary}${extraSummary}`
      : activeFilterCount > 0
      ? extraFilterLabels.length > 0
        ? extraFilterLabels.join(", ")
        : `필터 ${activeFilterCount}개 적용`
      : "분류와 상태를 좁혀보세요";

  return {
    activeFilterCount,
    summary,
  };
}
