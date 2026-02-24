/**
 * File Name : features/report/components/admin/AdminSearchBar.tsx
 * Description : 관리자용 공통 검색바 (Debounce 없이 Enter/Click 트리거)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   관리자 리스트 검색용
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

/**
 * 관리자용 통합 검색바
 *
 * [기능]
 * 1. URL 쿼리 파라미터(q)와 연동되어 검색어 상태 관리
 * 2. Enter 키 또는 검색 아이콘 클릭 시 검색 실행
 * 3. 검색 실행 시 페이지를 1페이지로 자동 리셋
 */
export default function AdminSearchBar({
  placeholder = "검색어를 입력하세요...",
}: {
  placeholder?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (keyword.trim()) {
      params.set("q", keyword.trim());
    } else {
      params.delete("q");
    }

    params.set("page", "1"); // 검색 시 1페이지로 리셋
    router.push(`?${params.toString()}`);
  };

  return (
    <form onSubmit={handleSearch} className="relative max-w-sm">
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder={placeholder}
        className="input-primary w-full pl-10 pr-4 py-2.5 text-sm bg-surface"
      />
      <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-5 text-muted" />
    </form>
  );
}
