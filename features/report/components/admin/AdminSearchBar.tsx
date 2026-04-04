/**
 * File Name : features/report/components/admin/AdminSearchBar.tsx
 * Description : 관리자용 공통 검색바 (Debounce 없이 Enter/Click 트리거)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   관리자 리스트 검색용
 * 2026.03.18  임도헌   Modified  URL 쿼리 변경 시 입력값도 동기화해 뒤로가기/탭 이동 뒤 stale 검색어 표시 방지
 * 2026.03.29  임도헌   Modified  검색 아이콘만 있던 입력을 명시적 제출 버튼이 있는 검색 폼으로 정리
 * 2026.03.30  임도헌   Modified  q 외 쿼리 키(query 등)에도 재사용할 수 있게 queryKey 파라미터를 일반화
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

/**
 * 관리자용 통합 검색바
 *
 * [기능]
 * 1. URL 쿼리 파라미터(q 또는 query 등)와 연동되어 검색어 상태를 관리
 * 2. Enter 키 또는 명시적 검색 버튼 제출 시 검색 실행
 * 3. 검색 실행 시 페이지를 1페이지로 자동 리셋
 */
export default function AdminSearchBar({
  placeholder = "검색어를 입력하세요...",
  queryKey = "q",
}: {
  placeholder?: string;
  queryKey?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get(queryKey) || "");

  useEffect(() => {
    // 입력값 재동기화
    // 뒤로가기나 탭 이동처럼 URL이 먼저 바뀌는 경우에도 입력창이 현재 조건을 그대로 반영
    setKeyword(searchParams.get(queryKey) || "");
  }, [queryKey, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (keyword.trim()) {
      params.set(queryKey, keyword.trim());
    } else {
      params.delete(queryKey);
    }

    params.set("page", "1"); // 검색 시 1페이지로 리셋
    router.push(`?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="flex max-w-md items-center gap-3">
      <div className="relative flex-1">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder={placeholder}
          className="input-primary w-full bg-surface py-2.5 pl-10 pr-4 text-sm"
        />
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
      </div>
      <button type="submit" className="btn-primary h-11 px-6 text-sm font-bold">
        검색
      </button>
    </form>
  );
}
