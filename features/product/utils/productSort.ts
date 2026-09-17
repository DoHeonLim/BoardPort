/**
 * File Name : features/product/utils/productSort.ts
 * Description : 상품 목록 정렬 query 정규화 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   허용된 상품 정렬값과 기본 최신순 정규화 추가
 */

import type { ProductSort } from "@/features/product/types";

/** 상품 정렬 선택 UI와 URL 검증에서 공유하는 옵션 */
export const PRODUCT_SORT_OPTIONS: ReadonlyArray<{
  value: ProductSort;
  label: string;
}> = [
  { value: "latest", label: "최신순" },
  { value: "priceAsc", label: "낮은 가격순" },
  { value: "priceDesc", label: "높은 가격순" },
];

/**
 * URL에서 받은 값을 허용된 상품 정렬값으로 제한한다.
 *
 * @param value - URL query의 sort 값
 * @returns 허용된 정렬값 또는 기본 최신순
 */
export function normalizeProductSort(
  value: string | null | undefined
): ProductSort {
  return PRODUCT_SORT_OPTIONS.some((option) => option.value === value)
    ? (value as ProductSort)
    : "latest";
}
