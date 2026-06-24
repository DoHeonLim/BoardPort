/**
 * File Name : features/notification/components/NotificationPagination.tsx
 * Description : 알림 센터 전용 페이지네이션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.12  임도헌   Created   알림 센터에 맞는 이전/다음 기반 페이지네이션 추가
 * 2026.03.12  임도헌   Modified  URL 검색 파라미터를 유지한 채 page만 갱신하는 이전/다음 탐색 동작 추가
 * 2026.03.16  임도헌   Modified  페이지 전환도 replace로 처리해 BackButton이 진입점 복귀를 우선하도록 정리
 * 2026.04.10  임도헌   Modified  notification 타이포 정책에 맞춰 페이지네이션 버튼/카운트 weight를 500 기준으로 정리
 */
"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";

interface NotificationPaginationProps {
  currentPage: number;
  totalPages: number;
}

/**
 * 알림 센터 전용 페이지네이션
 *
 * [기능]
 * 1. 관리자용 숫자형 UI 대신 이전/다음 중심 탐색 제공
 * 2. 현재 URL 검색 파라미터를 유지한 채 `page`만 갱신
 * 3. 알림 센터 내부 열람 상태 전환이므로 히스토리를 남기지 않도록 replace 사용
 */
export default function NotificationPagination({
  currentPage,
  totalPages,
}: NotificationPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * 대상 페이지로 이동하며 기존 검색 파라미터를 유지
   */
  const movePage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.replace(`?${params.toString()}`);
  };

  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface px-3 py-2 shadow-sm">
      <button
        type="button"
        onClick={() => movePage(currentPage - 1)}
        disabled={currentPage === 1}
        className="focus-ring-soft inline-flex min-h-[40px] min-w-[88px] items-center justify-center gap-1.5 rounded-xl border border-border-subtle bg-background px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeftIcon className="size-4" />
        이전
      </button>

      <p className="shrink-0 text-sm font-medium text-primary">
        {currentPage}
        <span className="mx-1 text-muted">/</span>
        {totalPages}
      </p>

      <button
        type="button"
        onClick={() => movePage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="focus-ring-soft inline-flex min-h-[40px] min-w-[88px] items-center justify-center gap-1.5 rounded-xl border border-border-subtle bg-background px-3 text-sm font-medium text-primary transition-colors hover:bg-surface-dim disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음
        <ChevronRightIcon className="size-4" />
      </button>
    </div>
  );
}
