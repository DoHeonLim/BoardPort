/**
 * File Name : features/search/components/SearchBar.tsx
 * Description : 검색 바 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.17  임도헌   Created
 * 2024.12.17  임도헌   Modified  검색 바 컴포넌트 생성
 * 2024.12.23  임도헌   Modified  검색 바 컴포넌트 다크모드 추가
 * 2024.12.29  임도헌   Modified  검색후 섹션 컴포넌트 닫히게 변경
 * 2025.04.18  임도헌   Modified  검색바 마진 수정
 * 2025.04.30  임도헌   Modified  성능 최적화 및 사용자 경험 개선
 * 2025.06.17  임도헌   Modified  검색어 입력 UI로 역할 축소, 도메인 독립 구조로 리팩토링
 * 2025.07.04  임도헌   Modified  Controlled Component 전환 및 상태 동기화
 * 2026.01.11  임도헌   Modified  시맨틱 인풋 스타일 적용 및 로딩 인디케이터 개선
 * 2026.01.12  임도헌   Modified  height, font size 조정
 * 2026.01.17  임도헌   Moved     components/search -> features/search/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.26  임도헌   Modified  다크모드 개선
 */
"use client";

import { useEffect, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  className?: string;
  autoFocus?: boolean;
  onSearch: (keyword: string) => void;
}

/**
 * 검색어 입력 및 제출을 담당하는 컴포넌트
 *
 * - 입력값을 로컬 상태로 관리하고, 외부(`value` prop) 변경 시 동기화
 * - 폼 제출 시 `onSearch` 콜백을 호출하며, 잠시 로딩 스피너를 표시
 */
export default function SearchBar({
  placeholder = "검색",
  value,
  className = "",
  autoFocus = false,
  onSearch,
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(value);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setKeyword(value);
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    setIsPending(true);
    onSearch(trimmed);
    setTimeout(() => setIsPending(false), 500); // 최소 로딩 표시
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative flex-1 w-full", className)}
    >
      <input
        type="text"
        name="search"
        placeholder={placeholder}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        autoFocus={autoFocus}
        className={cn(
          "input-primary h-10 w-full pl-9 pr-8 text-base md:text-sm",
          "bg-surface-dim border border-border focus:border-brand/70 focus:bg-surface dark:focus:bg-black/20"
        )}
      />
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted pointer-events-none" />

      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="size-4 border-2 border-brand/30 border-t-brand dark:border-brand-light/30 dark:border-t-brand-light rounded-full animate-spin" />
        </div>
      )}
    </form>
  );
}
