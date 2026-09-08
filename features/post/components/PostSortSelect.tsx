/**
 * File Name : features/post/components/PostSortSelect.tsx
 * Description : 게시글 목록 URL 정렬 선택 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   검색·카테고리를 유지하는 게시글 정렬 선택 추가
 */

"use client";

import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PostSort } from "@/features/post/types";
import { POST_SORT_OPTIONS } from "@/features/post/utils/postSort";

interface PostSortSelectProps {
  value: PostSort;
}

/**
 * 현재 검색·카테고리 query를 보존하면서 게시글 정렬을 변경한다.
 * 기본 최신순은 URL에서 생략해 `/posts`를 정규 경로로 유지한다.
 *
 * @param props - 현재 정렬값
 * @returns 게시글 정렬 select
 */
export default function PostSortSelect({ value }: PostSortSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (nextSort: PostSort) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSort === "latest") {
      params.delete("sort");
    } else {
      params.set("sort", nextSort);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <label className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-2.5 text-sm font-medium text-muted transition-[border-color,box-shadow] focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/25 dark:focus-within:border-brand-light/70 dark:focus-within:ring-brand-light/25 sm:min-h-[44px] sm:px-3">
      <ArrowsUpDownIcon className="size-4" aria-hidden="true" />
      <span className="sr-only">게시글 정렬</span>
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value as PostSort)}
        aria-label="게시글 정렬"
        className="cursor-pointer border-0 bg-transparent p-0 pr-6 text-sm font-bold text-primary shadow-none outline-none focus:ring-0"
      >
        {POST_SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
