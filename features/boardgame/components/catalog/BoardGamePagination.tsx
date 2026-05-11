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
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { buildBoardGameListHref } from "@/features/boardgame/utils/catalogFilters";
import type { BoardGameCatalogFilters } from "@/features/boardgame/types/catalog";

interface BoardGamePaginationProps {
  page: number;
  totalPages: number;
  filters: BoardGameCatalogFilters;
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
}: BoardGamePaginationProps) {
  if (totalPages <= 1) return null;

  const visiblePages = buildVisiblePages(page, totalPages);

  return (
    <nav
      className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3"
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
    "focus-ring-soft rounded-lg p-2 text-muted transition-colors hover:bg-surface-dim disabled:opacity-30 disabled:hover:bg-transparent";
  const pageClass =
    "focus-ring-soft min-w-10 rounded-xl border px-3 py-2 text-sm font-medium transition-colors";
  const activePageClass = "border-border-strong bg-brand text-white";
  const inactivePageClass =
    "border-border bg-surface text-primary hover:bg-surface-dim";

  if (disabled) {
    return (
      <span
        className={variant === "icon" ? `${iconClass} opacity-30` : `${pageClass} ${inactivePageClass} opacity-40`}
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
