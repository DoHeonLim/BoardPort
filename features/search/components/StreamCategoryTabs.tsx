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
 * 2026.03.11  임도헌   Modified  스트림 모바일 헤더 flat 톤에 맞춰 neutral tone 및 compact 밀도 분기 추가
 * 2026.03.12  임도헌   Modified  스트림 카테고리 탭 외곽선을 border-border-subtle 기준으로 통일
 * 2026.03.22  임도헌   Modified  데스크톱 좌우 스크롤 버튼 추가로 잘린 카테고리 접근성 보강
 * 2026.03.25  임도헌   Modified  데스크톱 카테고리 레일/스크롤 버튼 밀도를 조정해 헤더 무게 완화
 * 2026.03.28  임도헌   Modified  neutral tone 활성 카테고리 탭을 스코프 탭과 동일한 flat active 문법으로 정리해 스트림 검색 헤더 정합성 보강
 */
"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { STREAM_CATEGORY } from "@/features/stream/constants";
import { cn } from "@/lib/utils";

interface StreamCategoryTabsProps {
  currentCategory?: string;
  compact?: boolean;
  tone?: "default" | "neutral";
}

/**
 * 스트리밍 목록용 카테고리 필터 탭
 * - 기존 검색어(keyword)나 스코프(scope) 파라미터를 유지하면서 카테고리만 변경
 * - 모바일은 손가락 스크롤, 데스크톱은 좌우 스크롤 버튼으로 숨겨진 탭 접근을 보조
 * - `compact`, `tone` props로 헤더 밀도와 flat 톤을 분기
 */
export default function StreamCategoryTabs({
  currentCategory,
  compact = false,
  tone = "default",
}: StreamCategoryTabsProps) {
  const searchParam = useSearchParams();
  const scrollContainerRef = useRef<HTMLElement>(null);

  const buildHref = useMemo(() => {
    return (nextCategory?: string) => {
      const params = new URLSearchParams(searchParam?.toString() ?? "");

      if (!nextCategory) params.delete("category");
      else params.set("category", nextCategory);

      const q = params.toString();
      return q ? `/streams?${q}` : "/streams";
    };
  }, [searchParam]);

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 200;
    const targetScroll =
      scrollContainerRef.current.scrollLeft +
      (direction === "left" ? -scrollAmount : scrollAmount);

    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative group/scroll">
      <button
        type="button"
        onClick={() => scroll("left")}
        className={cn(
          "absolute left-0 top-1/2 z-20 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border opacity-50 transition-all group-hover/scroll:opacity-100 md:flex",
          tone === "neutral"
            ? "bg-background/95 text-muted border-border-subtle hover:text-primary"
            : "bg-surface/95 text-muted border-border-subtle hover:text-primary"
        )}
        aria-label="왼쪽 카테고리 보기"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      <div className="relative px-0 md:px-8 lg:px-9">
        <nav
          ref={scrollContainerRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide py-0.5 sm:gap-2"
          aria-label="스트리밍 카테고리"
        >
          <Link
            href={buildHref(undefined)}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full border font-medium whitespace-nowrap transition-all",
              compact
                ? "min-h-[30px] px-3 text-[12px] sm:min-h-[34px] sm:px-4 sm:text-[13px]"
                : "min-h-[36px] px-4 text-sm",
              !currentCategory
                ? tone === "neutral"
                  ? "bg-surface text-brand border-border-subtle shadow-sm ring-1 ring-border/60 dark:text-brand-light"
                  : "bg-brand text-white border-brand shadow-sm dark:border-white/20"
                : tone === "neutral"
                  ? "bg-surface/65 text-muted border-border-subtle hover:bg-surface hover:text-primary"
                  : "bg-surface text-muted border-border-subtle hover:border-brand/50 hover:text-primary"
            )}
          >
            전체
          </Link>

          {Object.entries(STREAM_CATEGORY).map(([key, label]) => (
            <Link
              key={key}
              href={buildHref(key)}
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border font-medium whitespace-nowrap transition-all",
                compact
                  ? "min-h-[30px] px-3 text-[12px] sm:min-h-[34px] sm:px-4 sm:text-[13px]"
                  : "min-h-[36px] px-4 text-sm",
                currentCategory === key
                  ? tone === "neutral"
                    ? "bg-surface text-brand border-border-subtle shadow-sm ring-1 ring-border/60 dark:text-brand-light"
                    : "bg-brand text-white border-brand shadow-sm dark:border-white/20"
                  : tone === "neutral"
                    ? "bg-surface/65 text-muted border-border-subtle hover:bg-surface hover:text-primary"
                    : "bg-surface text-muted border-border-subtle hover:border-brand/50 hover:text-primary"
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        className={cn(
          "absolute right-0 top-1/2 z-20 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border opacity-50 transition-all group-hover/scroll:opacity-100 md:flex",
          tone === "neutral"
            ? "bg-background/95 text-muted border-border-subtle hover:text-primary"
            : "bg-surface/95 text-muted border-border-subtle hover:text-primary"
        )}
        aria-label="오른쪽 카테고리 보기"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
