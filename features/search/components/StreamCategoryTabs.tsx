/**
 * File Name : features/search/components/StreamCategoryTabs.tsx
 * Description : 스트리밍 카테고리 탭
 * Author : 임도헌
 *
 * History
 * 2025.05.22  임도헌   Created
 * 2025.05.22  임도헌   Modified  스트리밍 카테고리 탭 추가
 * 2025.09.10  임도헌   Modified  검색/스코프 파라미터 유지, a11y(aria-current) 보강
 * 2025.11.23  임도헌   Modified  모바일 UI 수정
 * 2026.01.11  임도헌   Modified  시맨틱 탭 스타일(bg-brand / bg-surface-dim) 적용
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  다크모드 가시성 개선
 * 2026.03.06  임도헌   Modified  카테고리 탭 높이와 타이포를 게시글 탭과 동일한 밀도로 통일
 */
"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { STREAM_CATEGORY } from "@/features/stream/constants";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface StreamCategoryTabsProps {
  currentCategory?: string;
}

/**
 * 스트리밍 목록용 카테고리 필터 탭
 * - 기존 검색어(keyword)나 스코프(scope) 파라미터를 유지하면서 카테고리만 변경
 */
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
      className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
      aria-label="스트리밍 카테고리"
    >
      <Link
        href={buildHref(undefined)}
        className={cn(
          "inline-flex min-h-[36px] items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all border",
          !currentCategory
            ? "bg-brand text-white border-brand shadow-md dark:border-white/20"
            : "bg-surface text-muted border-border hover:border-brand/50 hover:text-primary"
        )}
      >
        전체
      </Link>

      {Object.entries(STREAM_CATEGORY).map(([key, label]) => (
        <Link
          key={key}
          href={buildHref(key)}
          className={cn(
            "inline-flex min-h-[36px] items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition-all border",
            currentCategory === key
              ? "bg-brand text-white border-brand shadow-md dark:border-white/20"
              : "bg-surface text-muted border-border hover:border-brand/50 hover:text-primary"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
