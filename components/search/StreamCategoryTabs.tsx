/**
 * File Name : components/search/StreamCategoryTabs
 * Description : 스트리밍 카테고리 탭
 * Author : 임도헌
 *
 * History
 * 2025.05.22  임도헌   Created
 * 2025.05.22  임도헌   Modified  스트리밍 카테고리 탭 추가
 * 2025.09.10  임도헌   Modified  검색/스코프 파라미터 유지, a11y(aria-current) 보강
 * 2025.11.23  임도헌   Modified  모바일 UI 수정
 * 2026.01.11  임도헌   Modified  시맨틱 탭 스타일(bg-brand / bg-surface-dim) 적용
 */
"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { STREAM_CATEGORY } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface StreamCategoryTabsProps {
  currentCategory?: string;
}

export default function StreamCategoryTabs({
  currentCategory,
}: StreamCategoryTabsProps) {
  const searchParam = useSearchParams();

  // 기존 keyword/scope를 보존하면서 category만 바꾸는 href 빌더
  const buildHref = useMemo(() => {
    return (nextCategory?: string) => {
      const params = new URLSearchParams(searchParam?.toString() ?? "");

      // category 갱신
      if (!nextCategory) params.delete("category");
      else params.set("category", nextCategory);
      const q = params.toString();
      return q ? `/streams?${q}` : `/streams`;
    };
  }, [searchParam]);

  return (
    <nav
      className="flex gap-2 overflow-x-auto scrollbar-hide pb-1"
      aria-label="스트리밍 카테고리"
    >
      <Link
        href={buildHref(undefined)}
        className={cn(
          "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
          !currentCategory
            ? "bg-brand text-white shadow-md"
            : "bg-surface-dim text-muted hover:text-primary hover:bg-surface border border-transparent hover:border-border"
        )}
      >
        전체
      </Link>

      {Object.entries(STREAM_CATEGORY).map(([key, label]) => (
        <Link
          key={key}
          href={buildHref(key)}
          className={cn(
            "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
            currentCategory === key
              ? "bg-brand text-white shadow-md"
              : "bg-surface-dim text-muted hover:text-primary hover:bg-surface border border-transparent hover:border-border"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
