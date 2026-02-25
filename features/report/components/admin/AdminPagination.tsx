/**
 * File Name : components/ui/AdminPagination.tsx
 * Description : 관리자 페이지용 페이지네이션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created
 */
"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";

interface Props {
  currentPage: number;
  totalPages: number;
}

/**
 * 관리자 페이지 전용 페이지네이션
 *
 * [기능]
 * 1. 현재 페이지와 총 페이지 수를 기반으로 이전/다음 이동 버튼 렌더링
 * 2. URL 쿼리 파라미터(page)를 업데이트하여 라우팅 처리
 * 3. 첫 페이지/마지막 페이지에서 이동 불가 상태 처리
 */
export default function AdminPagination({ currentPage, totalPages }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  const btnClass =
    "p-2 rounded-lg transition-colors hover:bg-surface-dim disabled:opacity-30 disabled:hover:bg-transparent text-muted";

  return (
    <div className="flex items-center justify-center gap-4 mt-6">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={btnClass}
        aria-label="이전 페이지"
      >
        <ChevronLeftIcon className="size-5" />
      </button>

      <span className="text-sm font-bold text-primary">
        {currentPage} <span className="text-muted font-normal mx-1">/</span>{" "}
        {totalPages}
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
