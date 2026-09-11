/**
 * File Name : components/ui/UrlSortSelect.tsx
 * Description : URL query 기반 공용 목록 정렬 select
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   현재 query를 보존하는 목록 정렬 선택 UI 추가
 * 2026.09.08  임도헌   Modified  앱 테마에 맞춰 네이티브 옵션 창의 색상 체계 고정
 */

"use client";

import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface UrlSortSelectProps<T extends string> {
  value: T;
  defaultValue: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  ariaLabel: string;
}

/**
 * 현재 경로의 query를 보존하면서 sort 값만 변경한다.
 * 기본 정렬은 URL에서 생략해 목록의 정규 경로를 유지한다.
 *
 * @param props - 현재값, 기본값, 표시 옵션과 접근성 이름
 * @returns URL query와 연결된 정렬 select
 */
export default function UrlSortSelect<T extends string>({
  value,
  defaultValue,
  options,
  ariaLabel,
}: UrlSortSelectProps<T>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (nextSort: T) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextSort === defaultValue) {
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
      <span className="sr-only">{ariaLabel}</span>
      <select
        value={value}
        onChange={(event) => handleChange(event.target.value as T)}
        aria-label={ariaLabel}
        className="cursor-pointer border-0 bg-transparent p-0 pr-6 text-sm font-bold text-primary shadow-none outline-none [color-scheme:light] focus:ring-0 dark:[color-scheme:dark]"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-surface text-primary"
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
