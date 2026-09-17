/**
 * File Name : features/product/components/ProductSortSelect.tsx
 * Description : 상품 목록 URL 정렬 선택 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   검색·필터를 유지하는 상품 정렬 선택 추가
 */

import UrlSortSelect from "@/components/ui/UrlSortSelect";
import type { ProductSort } from "@/features/product/types";
import { PRODUCT_SORT_OPTIONS } from "@/features/product/utils/productSort";

interface ProductSortSelectProps {
  value: ProductSort;
}

/**
 * 상품 정렬 옵션과 기본 최신순을 공용 URL 정렬 select에 전달한다.
 *
 * @param props - 현재 정렬값
 * @returns 상품 정렬 select
 */
export default function ProductSortSelect({ value }: ProductSortSelectProps) {
  return (
    <UrlSortSelect
      value={value}
      defaultValue="latest"
      options={PRODUCT_SORT_OPTIONS}
      ariaLabel="상품 정렬"
    />
  );
}
