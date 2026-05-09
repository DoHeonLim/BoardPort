/**
 * File Name : features/search/components/PostCategoryTabs.tsx
 * Description : 게시글 카테고리 탭
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.19  임도헌   Created
 * 2024.12.19  임도헌   Modified  게시글 카테고리 탭 컴포넌트 생성
 * 2024.12.20  임도헌   Modified  게시글 카테고리 탭 컴포넌트 다크모드 추가
 * 2025.04.18  임도헌   Modified  통일감 주기 위해서 refs 대문자로 변경
 * 2025.07.04  임도헌   Modified  모바일 환경 long-press 툴팁 표시 지원 추가
 * 2025.07.04  임도헌   Modified  PostCategoryTabs UI 버튼 사이즈 및 스크롤 UX 개선
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 탭 스타일 및 스크롤 버튼 접근성 개선
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.19  임도헌   Modified  탭 변경 시 region 파라미터 보존 및 자동 전환 로직 정교화
 * 2026.02.20  임도헌   Modified  지역 범위 관리가 DB로 이관됨에 따라 불필요한 URL 쿼리 제어 삭제
 * 2026.02.26  임도헌   Modified  다크모드 개선
 * 2026.03.06  임도헌   Modified  게시글 카테고리 탭의 높이/타이포를 스트림 탭과 동일한 밀도로 통일
 * 2026.03.11  임도헌   Modified  flat 헤더 톤에 맞춰 neutral tone 및 compact 밀도 분기 추가
 * 2026.03.12  임도헌   Modified  게시글 카테고리 탭과 툴팁 외곽선을 border-border-subtle 기준으로 정리
 * 2026.03.18  임도헌   Modified  카테고리 변경 후 불필요한 router.refresh를 제거해 중복 재요청 완화
 * 2026.03.30  임도헌   Modified  사용자 이해를 높이기 위해 카테고리 라벨을 자유/모집/후기/공략/질문 기준으로 정리
 * 2026.03.31  임도헌   Modified  추천 카테고리 추가에 맞춰 탭/툴팁 ref 구성을 확장
 * 2026.04.02  임도헌   Modified  게시글 탭 롱프레스 시간을 search 도메인 공용 상수 기준으로 정리
 * 2026.04.10  임도헌   Modified  검색 타이포 정책에 맞춰 compact 탭 크기를 text-xs/text-sm 스케일로 정리
 * 2026.04.10  임도헌   Modified  상위 게시글 헤더 클라이언트 경계 아래에서만 사용되도록 use client 중복 선언을 제거
 * 2026.04.14  임도헌   Modified  카테고리 탭 링크 prefetch를 비활성화해 탭별 RSC 선요청을 줄임
 * 2026.04.20  임도헌   Modified  키보드 포커스가 브라우저 기본 outline으로 보이지 않도록 공용 soft 포커스 규칙을 적용
 * 2026.05.03  임도헌   Modified  카테고리 툴팁이 뒤 콘텐츠와 섞이지 않도록 불투명 surface 톤으로 보정
 * 2026.05.05  임도헌   Modified  카테고리 탭 상호작용 핸들러 JSDoc 보강
 */

import { useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  POST_CATEGORY,
  POST_CATEGORY_DESCRIPTIONS,
} from "@/features/post/constants";
import { SEARCH_TAB_TOOLTIP_LONG_PRESS_MS } from "@/features/search/constants";
import Link from "next/link";
import { useFloating, offset, shift, flip } from "@floating-ui/react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface IPostCategoryTabsProps {
  currentCategory?: string;
  compact?: boolean;
  tone?: "default" | "neutral";
}

/**
 * 게시글 카테고리 필터 탭
 *
 * - 가로 스크롤 가능한 탭 목록을 렌더링
 * - PC에서는 좌우 화살표, 모바일에서는 터치 스크롤을 지원
 * - PC 호버 또는 모바일 롱프레스 시 카테고리 설명을 툴팁으로 표시
 * - `compact`, `tone` props로 헤더 밀도와 flat 톤을 분기
 */
export default function PostCategoryTabs({
  currentCategory,
  compact = false,
  tone = "default",
}: IPostCategoryTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null); // long press 타이머 ref
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  /**
   * 게시글 카테고리 변경 시 검색어 초기화와 목록 URL 갱신
   *
   * @param category - 선택한 게시글 카테고리 key, 없으면 전체
   */
  const handleCategoryClick = (category?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("keyword"); // 검색어 초기화

    if (category) {
      params.set("category", category);
    } else {
      params.delete("category"); // 전체 보기
    }

    router.push(`/posts?${params.toString()}`);
  };

  const isTouchDevice =
    typeof window !== "undefined" && "ontouchstart" in window;

  /**
   * 터치 디바이스에서 long press 툴팁 노출 타이머 시작
   *
   * @param key - 툴팁을 띄울 카테고리 key
   */
  const handleTouchStart = (key: string) => {
    if (isTouchDevice) {
      timeoutRef.current = setTimeout(() => {
        setActiveTooltip(key);
      }, SEARCH_TAB_TOOLTIP_LONG_PRESS_MS);
    }
  };

  /**
   * long press 툴팁 타이머와 활성 툴팁 상태 정리
   */
  const handleTouchEnd = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setActiveTooltip(null);
  };

  /**
   * useFloating: Floating UI의 핵심 훅으로, 툴팁의 위치를 동적으로 계산하고 관리
   *
   * placement: 툴팁이 표시될 기본 위치 설정
   * - 'bottom': 요소 아래에 툴팁 배치
   * - 그 외 'top', 'left', 'right' 등 다양한 위치 지정 가능
   *
   * middleware: 툴팁 위치 조정을 위한 미들웨어 배열
   * 1. offset(8): 참조 요소로부터 8픽셀 거리 유지
   * 2. shift({ padding: 8 }): 뷰포트 경계에 닿으면 자동으로 위치 이동 (8픽셀 여백 유지)
   * 3. flip({ padding: 8 }): 공간이 부족하면 반대 방향으로 전환 (8픽셀 여백 유지)
   */
  const tooltipRefs = {
    ALL: useFloating({
      placement: "bottom",
      middleware: [offset(8), shift({ padding: 8 }), flip({ padding: 8 })],
    }),
    FREE: useFloating({
      placement: "bottom",
      middleware: [offset(8), shift({ padding: 8 }), flip({ padding: 8 })],
    }),
    CREW: useFloating({
      placement: "bottom",
      middleware: [offset(8), shift({ padding: 8 }), flip({ padding: 8 })],
    }),
    LOG: useFloating({
      placement: "bottom",
      middleware: [offset(8), shift({ padding: 8 }), flip({ padding: 8 })],
    }),
    MAP: useFloating({
      placement: "bottom",
      middleware: [offset(8), shift({ padding: 8 }), flip({ padding: 8 })],
    }),
    RECOMMEND: useFloating({
      placement: "bottom",
      middleware: [offset(8), shift({ padding: 8 }), flip({ padding: 8 })],
    }),
    COMPASS: useFloating({
      placement: "bottom",
      middleware: [offset(8), shift({ padding: 8 }), flip({ padding: 8 })],
    }),
  } as const;

  /**
   * 카테고리 탭 목록의 버튼 방향 기준 부드러운 스크롤
   *
   * @param direction - 스크롤 방향
   */
  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      const targetScroll =
        scrollContainerRef.current.scrollLeft +
        (direction === "left" ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: targetScroll,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="relative group/scroll">
      {/* 왼쪽 스크롤 버튼 */}
      <button
        onClick={() => scroll("left")}
        className={cn(
          "focus-ring-soft absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center size-8 rounded-full border shadow-sm text-muted hover:text-primary transition-[background-color,color,border-color,box-shadow,opacity] opacity-60 group-hover/scroll:opacity-100",
          tone === "neutral"
            ? "bg-background border-border-subtle"
            : "bg-surface/80 backdrop-blur-sm border-border-subtle"
        )}
        aria-label="scroll left"
      >
        <ChevronLeftIcon className="size-4" />
      </button>

      <div className="relative px-0 sm:px-10">
        <div
          ref={scrollContainerRef}
          className={cn(
            "flex gap-2 overflow-x-auto scrollbar-hide items-center px-4 sm:px-0",
            compact ? "h-10 sm:h-12" : "h-12",
            // 스크롤 맨 끝에 도달했을 때 우측 여백이 잘리지 않도록 투명 여백 강제 추가
            "after:content-[''] after:pr-4 sm:after:pr-0"
          )}
          style={{
            WebkitOverflowScrolling: "touch", // iOS 부드러운 스와이프
          }}
        >
          <div
            ref={tooltipRefs.ALL.refs.setReference} // 툴팁의 기준점이 될 요소 지정
            className="shrink-0"
            onMouseEnter={() => !isTouchDevice && setActiveTooltip("ALL")}
            onMouseLeave={() => !isTouchDevice && setActiveTooltip(null)}
            onTouchStart={() => handleTouchStart("ALL")}
            onTouchEnd={handleTouchEnd}
          >
            <Link
              href="/posts"
              prefetch={false}
              onClick={(e) => {
                e.preventDefault();
                handleCategoryClick();
              }}
              className={cn(
                "focus-ring-soft inline-flex items-center rounded-full font-medium transition-[background-color,color,border-color,box-shadow] whitespace-nowrap",
                compact
                  ? "min-h-[32px] px-3 text-xs sm:min-h-[36px] sm:px-4 sm:text-sm"
                  : "min-h-[36px] px-4 text-sm",
                !currentCategory
                  ? "bg-brand text-white shadow-md dark:border dark:border-white/20"
                  : tone === "neutral"
                    ? "bg-surface-dim text-muted hover:bg-surface hover:text-primary border border-border-subtle"
                    : "bg-surface-dim text-muted hover:bg-surface hover:text-primary border border-transparent hover:border-border-subtle"
              )}
            >
              ⚓ 전체
            </Link>
          </div>

          {activeTooltip === "ALL" && (
            <div
              /**
               * tooltipRefs.all.refs.setFloating: 실제 툴팁 요소를 지정
               *
               * tooltipRefs.all.floatingStyles:
               * - Floating UI가 계산한 위치 스타일 (top, left 등)
               * - 뷰포트 경계, 스크롤 위치 등을 고려하여 자동으로 업데이트
               *
               * position: "fixed":
               * - 스크롤에 관계없이 뷰포트를 기준으로 고정 위치 지정
               * - 스크롤 시에도 참조 요소를 따라다니도록 함
               */
              ref={tooltipRefs.ALL.refs.setFloating}
              style={{
                ...tooltipRefs.ALL.floatingStyles,
                position: "fixed",
                zIndex: 9999,
              }}
              className="pointer-events-none rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-primary shadow-lg"
            >
              모든 게시글을 볼 수 있습니다
            </div>
          )}

          {Object.entries(POST_CATEGORY).map(([key, value]) => (
            <div
              key={key}
              /**
               * 각 카테고리별 툴팁의 기준점 요소 지정
               * tooltipRefs[key].refs.setReference로 해당 카테고리의
               * 툴팁 위치 계산을 위한 기준점을 설정
               */
              ref={
                tooltipRefs[key as keyof typeof POST_CATEGORY].refs.setReference
              }
              className="shrink-0"
              onMouseEnter={() => !isTouchDevice && setActiveTooltip(key)}
              onMouseLeave={() => !isTouchDevice && setActiveTooltip(null)}
              onTouchStart={() => handleTouchStart(key)} // 모바일 long press 시작
              onTouchEnd={handleTouchEnd} // 모바일 long press 종료
            >
              <Link
                href={`/posts?category=${key}`}
                prefetch={false}
                onClick={(e) => {
                  e.preventDefault();
                  handleCategoryClick(key);
                }}
                className={cn(
                  "focus-ring-soft inline-flex items-center rounded-full font-medium transition-[background-color,color,border-color,box-shadow] whitespace-nowrap",
                  compact
                    ? "min-h-[32px] px-3 text-xs sm:min-h-[36px] sm:px-4 sm:text-sm"
                    : "min-h-[36px] px-4 text-sm",
                  currentCategory === key
                    ? "bg-brand text-white shadow-md dark:border dark:border-white/20"
                    : tone === "neutral"
                      ? "bg-surface-dim text-muted hover:bg-surface hover:text-primary border border-border-subtle"
                      : "bg-surface-dim text-muted hover:bg-surface hover:text-primary border border-transparent hover:border-border-subtle"
                )}
              >
                {value}
              </Link>
              {activeTooltip === key && (
                <div
                  /**
                   * 각 카테고리별 실제 툴팁 요소
                   * tooltipRefs[key].refs.setFloating으로 툴팁 요소를 지정하고
                   * floatingStyles를 적용하여 동적으로 위치가 조정됨
                   */
                  ref={
                    tooltipRefs[key as keyof typeof POST_CATEGORY].refs
                      .setFloating
                  }
                  style={{
                    ...tooltipRefs[key as keyof typeof POST_CATEGORY]
                      .floatingStyles,
                    position: "fixed",
                    zIndex: 9999,
                  }}
                  className="pointer-events-none rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-primary shadow-lg"
                >
                  {
                    POST_CATEGORY_DESCRIPTIONS[
                      key as keyof typeof POST_CATEGORY_DESCRIPTIONS
                    ]
                  }
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 오른쪽 스크롤 버튼 */}
      <button
        onClick={() => scroll("right")}
        className={cn(
          "focus-ring-soft absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center size-8 rounded-full border shadow-sm text-muted hover:text-primary transition-[background-color,color,border-color,box-shadow,opacity] opacity-60 group-hover/scroll:opacity-100",
          tone === "neutral"
            ? "bg-background border-border-subtle"
            : "bg-surface/80 backdrop-blur-sm border-border-subtle"
        )}
        aria-label="scroll right"
      >
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
