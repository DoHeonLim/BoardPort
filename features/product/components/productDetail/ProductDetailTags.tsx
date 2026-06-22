/**
 * File Name : features/product/components/productDetail/ProductDetailTags.tsx
 * Description : 제품 상세 태그 목록
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.08  임도헌   Created   제품 태그 컴포넌트 분리
 * 2026.01.10  임도헌   Modified  시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.25  임도헌   Modified  주석 및 컴포넌트 구조 설명 보강
 * 2026.03.14  임도헌   Modified  태그 이모지(🏷️)를 # prefix로 교체해 렌더링 일관성 확보
 * 2026.06.14  임도헌   Modified  상세 태그 검색 이동 시 최근 검색어 저장과 캐시 갱신을 보강
 */

"use client";

import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { queryKeys } from "@/lib/queryKeys";
import { createSearchHistory } from "@/features/product/actions/history";
import { SEARCH_HISTORY_MAX_ITEMS } from "@/features/search/constants";
import { normalizeSearchKeyword } from "@/features/search/utils/keyword";
import type { SearchHistoryItem } from "@/features/search/types";
import type { ProductTag } from "@/features/product/types";

interface ProductDetailTagsProps {
  tags: ProductTag[];
}

/**
 * 태그 목록을 표시
 * 클릭 시 해당 태그로 검색 결과 이동
 */
export default function ProductDetailTags({ tags }: ProductDetailTagsProps) {
  const queryClient = useQueryClient();

  if (!tags || tags.length === 0) return null;

  const handleTagSearch = (keyword: string) => {
    const normalized = normalizeSearchKeyword(keyword);
    if (!normalized) return;

    queryClient.setQueryData(
      queryKeys.search.history(),
      (old: SearchHistoryItem[] = []) => {
        const filtered = old.filter((item) => item.keyword !== normalized);
        return [
          { keyword: normalized, created_at: new Date() },
          ...filtered,
        ].slice(0, SEARCH_HISTORY_MAX_ITEMS);
      }
    );

    void createSearchHistory(normalized);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Link
          key={tag.name}
          href={`/products?keyword=${encodeURIComponent(tag.name)}`}
          onClick={() => {
            handleTagSearch(tag.name);
          }}
          className={cn(
            "focus-ring-soft inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-[background-color,color,border-color,box-shadow] motion-safe:transition-transform",
            "bg-badge text-badge-text",
            "hover:opacity-80 active:scale-95",
            "border border-transparent dark:border-white/10"
          )}
        >
          #{tag.name}
        </Link>
      ))}
    </div>
  );
}
