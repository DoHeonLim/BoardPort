/**
 * File Name : features/boardgame/components/catalog/BoardGamePagination.tsx
 * Description : 보드게임 카탈로그 페이지네이션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   목록 페이지 페이지네이션 UI 분리
 * 2026.05.06  임도헌   Modified  관리자 페이지네이션과 같은 숫자형/ellipsis 탐색 패턴으로 정리
 * 2026.05.06  임도헌   Modified  숫자형 페이지네이션 JSDoc 명사형 기준 정리
 * 2026.05.12  임도헌   Modified  페이지 번호 직접 입력 이동 폼 추가
 * 2026.05.18  임도헌   Modified  직접 이동 버튼 아이콘을 다음 페이지와 구분되는 Enter 계열 아이콘으로 변경
 * 2026.05.18  임도헌   Modified  상단/하단 동시 배치와 숫자 버튼 중앙 정렬 보정
 */
"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowTurnDownLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { buildBoardGameListHref } from "@/features/boardgame/utils/catalogFilters";
import type { BoardGameCatalogFilters } from "@/features/boardgame/types/catalog";

interface BoardGamePaginationProps {
  page: number;
  totalPages: number;
  filters: BoardGameCatalogFilters;
  placement?: "top" | "bottom";
}

type VisiblePage = number | "ellipsis";

/**
 * 현재 페이지 주변 숫자와 ellipsis를 포함한 표시 페이지 목록 생성
 *
 * @param currentPage - 현재 페이지
 * @param totalPages - 전체 페이지 수
 * @returns 페이지 번호와 ellipsis 목록
 */
function buildVisiblePages(currentPage: number, totalPages: number): VisiblePage[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);
  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < totalPages) pages.add(currentPage + 1);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
  }

  const sorted = Array.from(pages)
    .filter((visiblePage) => visiblePage >= 1 && visiblePage <= totalPages)
    .sort((left, right) => left - right);

  const visiblePages: VisiblePage[] = [];
  sorted.forEach((visiblePage, index) => {
    if (index > 0 && visiblePage - sorted[index - 1] > 1) {
      visiblePages.push("ellipsis");
    }
    visiblePages.push(visiblePage);
  });

  return visiblePages;
}

/**
 * 현재 필터를 유지하는 공개 카탈로그 숫자형 페이지네이션
 *
 * @param props - 현재 페이지, 전체 페이지, 적용 필터
 * @returns 전체 페이지가 2개 이상일 때의 페이지네이션 UI
 */
export default function BoardGamePagination({
  page,
  totalPages,
  filters,
  placement = "bottom",
}: BoardGamePaginationProps) {
  const router = useRouter();
  const [targetPage, setTargetPage] = useState(String(page));

  // URL 이동이나 브라우저 뒤로가기 이후에도 입력값이 현재 페이지와 어긋나지 않도록 동기화
  useEffect(() => {
    setTargetPage(String(page));
  }, [page]);

  if (totalPages <= 1) return null;

  const visiblePages = buildVisiblePages(page, totalPages);
  const jumpInputId = `boardgame-page-jump-${placement}`;
  const jumpTotalId = `boardgame-page-jump-total-${placement}`;

  const handleJumpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // 사용자가 범위를 벗어난 페이지를 입력해도 유효 범위 안으로 보정해 이동
    const parsedPage = Number.parseInt(targetPage, 10);
    if (!Number.isFinite(parsedPage)) {
      setTargetPage(String(page));
      return;
    }

    const nextPage = Math.min(Math.max(parsedPage, 1), totalPages);
    setTargetPage(String(nextPage));
    if (nextPage === page) return;

    router.push(buildBoardGameListHref(nextPage, filters));
  };

  return (
    <nav
      className={
        placement === "top"
          ? "mb-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
          : "mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
      }
      aria-label="보드게임 도감 페이지네이션"
    >
      <PageLink
        page={page - 1}
        disabled={page <= 1}
        filters={filters}
        ariaLabel="이전 페이지"
        variant="icon"
      >
        <ChevronLeftIcon className="size-5" aria-hidden="true" />
      </PageLink>

      <div className="flex items-center gap-2">
        {visiblePages.map((visiblePage, index) =>
          visiblePage === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-sm font-medium text-muted"
            >
              ...
            </span>
          ) : (
            <PageLink
              key={visiblePage}
              page={visiblePage}
              disabled={false}
              filters={filters}
              ariaLabel={`${visiblePage}페이지로 이동`}
              current={visiblePage === page}
            >
              {visiblePage}
            </PageLink>
          )
        )}
      </div>

      <span className="ml-1 text-xs font-medium text-muted">
        총 {totalPages}페이지
      </span>

      <form
        onSubmit={handleJumpSubmit}
        className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-2 py-1 shadow-sm"
        aria-label="페이지 번호로 바로 이동"
      >
        <label htmlFor={jumpInputId} className="sr-only">
          이동할 페이지 번호
        </label>
        <input
          id={jumpInputId}
          type="number"
          min={1}
          max={totalPages}
          inputMode="numeric"
          value={targetPage}
          onChange={(event) => setTargetPage(event.target.value)}
          onBlur={() => {
            if (!targetPage.trim()) setTargetPage(String(page));
          }}
          className="h-9 w-16 rounded-lg border border-border bg-background px-2 text-center text-sm font-medium leading-none text-primary outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          aria-describedby={jumpTotalId}
        />
        <span
          id={jumpTotalId}
          className="whitespace-nowrap text-xs font-medium text-muted"
        >
          / {totalPages}
        </span>
        <button
          type="submit"
          className="focus-ring-soft inline-flex min-h-9 min-w-9 items-center justify-center rounded-lg bg-surface-dim text-muted transition-colors hover:bg-brand hover:text-white"
          aria-label="입력한 페이지로 이동"
        >
          <ArrowTurnDownLeftIcon className="size-4" aria-hidden="true" />
        </button>
      </form>

      <PageLink
        page={page + 1}
        disabled={page >= totalPages}
        filters={filters}
        ariaLabel="다음 페이지"
        variant="icon"
      >
        <ChevronRightIcon className="size-5" aria-hidden="true" />
      </PageLink>
    </nav>
  );
}

/**
 * 이동 가능 여부에 따른 Link 또는 비활성 span 렌더링
 *
 * @param props - 이동할 페이지, 비활성 여부, 현재 필터와 버튼 내용
 * @returns 페이지네이션 링크 또는 비활성 표시
 */
function PageLink({
  page,
  disabled,
  filters,
  children,
  ariaLabel,
  current = false,
  variant = "page",
}: {
  page: number;
  disabled: boolean;
  filters: BoardGameCatalogFilters;
  children: ReactNode;
  ariaLabel: string;
  current?: boolean;
  variant?: "page" | "icon";
}): ReactNode {
  const iconClass =
    "focus-ring-soft inline-flex size-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-dim disabled:opacity-30 disabled:hover:bg-transparent";
  const pageClass =
    "focus-ring-soft inline-flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm font-medium leading-none transition-colors";
  const activePageClass = "border-border-strong bg-brand text-white";
  const inactivePageClass =
    "border-border bg-surface text-primary hover:bg-surface-dim";

  if (disabled) {
    return (
      <span
        className={
          variant === "icon"
            ? `${iconClass} opacity-30`
            : `${pageClass} ${inactivePageClass} opacity-40`
        }
        aria-disabled="true"
        aria-label={ariaLabel}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={buildBoardGameListHref(page, filters)}
      className={
        variant === "icon"
          ? iconClass
          : `${pageClass} ${current ? activePageClass : inactivePageClass}`
      }
      aria-label={ariaLabel}
      aria-current={current ? "page" : undefined}
    >
      {children}
    </Link>
  );
}
