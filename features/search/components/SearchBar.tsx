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
 * 2026.03.06  임도헌   Modified  탭 간 상단 검색바 높이와 타이포 리듬을 통일
 * 2026.03.11  임도헌   Modified  flat 헤더 톤에 맞춰 compact 높이와 border 토큰 사용 흐름 반영
 * 2026.03.12  임도헌   Modified  compact 헤더 검색 트리거와 토큰 기반 입력 밀도 규칙 명확화
 * 2026.03.27  임도헌   Modified  검색 중 로딩 인디케이터가 얇은 막대로 보이지 않도록 스피너 표시 요소를 보정
 * 2026.04.10  임도헌   Modified  상위 클라이언트 래퍼 아래에서만 사용되도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.04.17  임도헌   Modified  탭 상단 검색바에 공통 입력 스타일 클래스를 적용
 * 2026.05.16  임도헌   Modified  검색 제출 로딩 표시 시간을 search 상수로 분리
 * 2026.06.15  임도헌   Modified  검색어가 있을 때 즉시 초기화할 수 있는 clear 버튼 추가
 * 2026.08.27  임도헌   Modified  검색 모달이 초기 포커스를 명시적으로 지정할 수 있도록 inputRef 전달 지원
 */

import { useEffect, useState, type Ref } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";
import { SEARCH_SUBMIT_PENDING_MS } from "@/features/search/constants";

interface SearchBarProps {
  placeholder?: string;
  value: string;
  className?: string;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  compact?: boolean;
  onSearch: (keyword: string) => void;
}

/**
 * 검색어 입력 및 제출을 담당하는 컴포넌트
 *
 * - 입력값을 로컬 상태로 관리하고, 외부(`value` prop) 변경 시 동기화
 * - 폼 제출 시 `onSearch` 콜백을 호출하며, 잠시 로딩 스피너를 표시
 * - `compact` 모드에서 헤더용 낮은 높이와 타이포 밀도를 적용
 */
export default function SearchBar({
  placeholder = "검색",
  value,
  className = "",
  autoFocus = false,
  inputRef,
  compact = false,
  onSearch,
}: SearchBarProps) {
  const [keyword, setKeyword] = useState(value);
  const [isPending, setIsPending] = useState(false);
  const hasKeyword = keyword.trim().length > 0;

  useEffect(() => {
    setKeyword(value);
  }, [value]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    setIsPending(true);
    onSearch(trimmed);
    setTimeout(() => setIsPending(false), SEARCH_SUBMIT_PENDING_MS);
  };

  const handleClear = () => {
    setKeyword("");
    setIsPending(true);
    onSearch("");
    setTimeout(() => setIsPending(false), SEARCH_SUBMIT_PENDING_MS);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative flex-1 w-full", className)}
    >
      <input
        ref={inputRef}
        type="text"
        name="search"
        placeholder={placeholder}
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        autoFocus={autoFocus}
        className={cn(
          compact
            ? "searchbar-compact-input pl-10 pr-9"
            : "input-primary h-11 w-full pl-10 pr-9 text-sm bg-surface-dim border border-border focus:border-brand/70 focus:bg-surface dark:focus:bg-black/20"
        )}
      />
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-muted pointer-events-none" />

      {hasKeyword && !isPending && (
        <button
          type="button"
          onClick={handleClear}
          className="focus-ring-soft absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition-colors hover:text-danger"
          aria-label="검색어 지우기"
        >
          <XMarkIcon className="size-4" />
        </button>
      )}

      {isPending && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <span className="block size-4 rounded-full border-2 border-brand/30 border-t-brand animate-spin dark:border-brand-light/30 dark:border-t-brand-light" />
        </div>
      )}
    </form>
  );
}
