/**
 * File Name : features/report/components/admin/AdminPagination.tsx
 * Description : 관리자 페이지용 페이지네이션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   관리자 목록 공통 페이지네이션 추가
 * 2026.03.30  임도헌   Modified  이전/다음만 있던 구조를 숫자형 페이지네이션으로 확장해 깊은 목록 탐색 속도를 보강
 * 2026.04.10  임도헌   Modified  페이지 버튼과 ellipsis weight를 관리자 타이포 정책에 맞춰 정리
 */
"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  currentPage: number;
  totalPages: number;
}

function buildVisiblePages(currentPage: number, totalPages: number) {
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
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);

  const visible: Array<number | "ellipsis"> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) {
      visible.push("ellipsis");
    }
    visible.push(page);
  });

  return visible;
}

/**
 * 관리자 페이지 전용 페이지네이션
 *
 * [기능]
 * 1. 현재 페이지 주변 숫자와 ellipsis를 포함한 숫자형 페이지네이션 렌더링
 * 2. URL 쿼리 파라미터(page)를 업데이트하여 현재 검색/필터 문맥을 유지한 채 이동
 * 3. 첫 페이지/마지막 페이지에서 이전/다음 이동 불가 상태 처리
 *
 * @param props - 현재 페이지와 전체 페이지 수
 * @returns 검색/필터 쿼리를 유지하는 관리자용 숫자형 페이지네이션
 */
export default function AdminPagination({ currentPage, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visiblePages = buildVisiblePages(currentPage, totalPages);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  const btnClass =
    "focus-ring-soft p-2 rounded-lg transition-colors hover:bg-surface-dim disabled:opacity-30 disabled:hover:bg-transparent text-muted";
  const pageBtnClass =
    "focus-ring-soft min-w-10 rounded-xl border px-3 py-2 text-sm font-medium transition-colors";

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={btnClass}
        aria-label="이전 페이지"
      >
        <ChevronLeftIcon className="size-5" />
      </button>

      <div className="flex items-center gap-2">
        {visiblePages.map((page, index) =>
          page === "ellipsis" ? (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-sm font-medium text-muted"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => handlePageChange(page)}
              aria-label={`${page}페이지로 이동`}
              aria-current={page === currentPage ? "page" : undefined}
              className={`${pageBtnClass} ${
                page === currentPage
                  ? "border-border-strong bg-brand text-white"
                  : "border-border bg-surface text-primary hover:bg-surface-dim"
              }`}
            >
              {page}
            </button>
          )
        )}
      </div>

      <span className="ml-1 text-xs font-medium text-muted">
        총 {totalPages}페이지
      </span>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={btnClass}
        aria-label="다음 페이지"
      >
        <ChevronRightIcon className="size-5" />
      </button>
    </div>
  );
}
