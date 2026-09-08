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
 * 2026.04.10  임도헌   Modified  검색 타이포 정책에 맞춰 compact 탭 크기를 text-xs/text-sm 스케일로 정리
 * 2026.04.10  임도헌   Modified  데스크톱 스크롤 버튼과 첫/마지막 탭이 겹쳐 보이지 않도록 레일 여백과 버튼 표면을 보강
 * 2026.04.16  임도헌   Modified  스트림 리스트 초기 네트워크 경합을 줄이기 위해 카테고리 링크 프리패치를 완화
 * 2026.04.20  임도헌   Modified  키보드 포커스가 브라우저 기본 outline으로 보이지 않도록 스트림 카테고리 탭과 화살표 버튼에 공용 포커스 유틸을 적용
 * 2026.04.20  임도헌   Modified  좌측 화살표가 첫 탭 보더를 침범하지 않도록 버튼 위치와 레일 시작 여백을 함께 조정
 * 2026.04.20  임도헌   Modified  스트림 페이지 헤더가 sm 구간부터 데스크톱 제어를 사용하도록 바뀐 흐름에 맞춰 화살표 표시 breakpoint를 sm으로 조정
 * 2026.08.27  임도헌   Modified  모션 축소 설정에서는 카테고리 레일을 즉시 스크롤하도록 보강
 * 2026.08.28  임도헌   Modified  카테고리 링크와 스크롤 함수 JSDoc 보강
 */
"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { STREAM_CATEGORY } from "@/features/stream/constants";
import { cn } from "@/lib/utils";
import { getMotionSafeScrollBehavior } from "@/lib/accessibility";

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

  /**
   * 기존 검색 조건을 유지하면서 선택 카테고리만 반영한 경로를 만든다.
   *
   * @param nextCategory - 이동할 스트리밍 카테고리
   * @returns 카테고리 쿼리가 반영된 스트리밍 목록 경로
   */
  const buildHref = useMemo(() => {
    return (nextCategory?: string) => {
      const params = new URLSearchParams(searchParam?.toString() ?? "");

      if (!nextCategory) params.delete("category");
      else params.set("category", nextCategory);

      const q = params.toString();
      return q ? `/streams?${q}` : "/streams";
    };
  }, [searchParam]);

  /**
   * 데스크톱 카테고리 레일을 지정한 방향으로 이동한다.
   *
   * @param direction - 이동할 가로 방향
   */
  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return;

    const scrollAmount = 200;
    const targetScroll =
      scrollContainerRef.current.scrollLeft +
      (direction === "left" ? -scrollAmount : scrollAmount);

    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: getMotionSafeScrollBehavior(),
    });
  };

  return (
    <div className="relative group/scroll">
      <button
        type="button"
        onClick={() => scroll("left")}
        className={cn(
          "focus-ring-soft absolute left-1 top-1/2 z-20 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border opacity-50 shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] supports-[backdrop-filter]:backdrop-blur-sm group-hover/scroll:opacity-100 sm:flex",
          tone === "neutral"
            ? "bg-background/95 text-muted border-border-subtle hover:text-primary"
            : "bg-surface/95 text-muted border-border-subtle hover:text-primary"
        )}
        aria-label="왼쪽 카테고리 보기"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      <div className="relative px-0 sm:pl-11 sm:pr-8 lg:pl-12 lg:pr-9">
        <nav
          ref={scrollContainerRef}
          className="flex gap-1.5 overflow-x-auto scrollbar-hide px-0.5 py-0.5 sm:gap-2"
          aria-label="스트리밍 카테고리"
        >
          <Link
            href={buildHref(undefined)}
            prefetch={false}
            className={cn(
              "focus-ring-soft inline-flex shrink-0 items-center rounded-full border font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow]",
              compact
                ? "min-h-[30px] px-3 text-xs sm:min-h-[34px] sm:px-4 sm:text-sm"
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
              prefetch={false}
              className={cn(
                "focus-ring-soft inline-flex shrink-0 items-center rounded-full border font-medium whitespace-nowrap transition-[background-color,color,border-color,box-shadow]",
                compact
                  ? "min-h-[30px] px-3 text-xs sm:min-h-[34px] sm:px-4 sm:text-sm"
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
          "focus-ring-soft absolute right-1 top-1/2 z-20 hidden size-7 -translate-y-1/2 items-center justify-center rounded-full border opacity-50 shadow-sm transition-[background-color,color,border-color,box-shadow,opacity] supports-[backdrop-filter]:backdrop-blur-sm group-hover/scroll:opacity-100 sm:flex",
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
