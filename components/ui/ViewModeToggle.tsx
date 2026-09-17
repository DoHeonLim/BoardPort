/**
 * File Name : components/ui/ViewModeToggle.tsx
 * Description : 리스트·그리드 보기 방식 공통 전환 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.13  임도헌   Created   목록 화면의 보기 방식 전환 UI와 접근성 상태 통일
 * 2026.09.14  임도헌   Modified  모바일 목록 조작 버튼의 최소 44px 터치 영역 확보
 */
"use client";

import { ListBulletIcon, Squares2X2Icon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

export type ViewModeValue = "list" | "grid";

interface ViewModeToggleProps {
  value: ViewModeValue;
  onChange: (value: ViewModeValue) => void;
  ariaLabel?: string;
  className?: string;
}

/** 목록 화면의 리스트·그리드 보기 방식 전환 */
export default function ViewModeToggle({
  value,
  onChange,
  ariaLabel = "목록 보기 방식",
  className,
}: ViewModeToggleProps) {
  const options = [
    { value: "list", label: "리스트 보기", Icon: ListBulletIcon },
    { value: "grid", label: "그리드 보기", Icon: Squares2X2Icon },
  ] as const;

  return (
    <div
      className={cn(
        "inline-flex shrink-0 rounded-xl border border-border-subtle bg-surface p-1 shadow-sm",
        className
      )}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map(({ value: optionValue, label, Icon }) => {
        const isSelected = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            aria-label={label}
            aria-pressed={isSelected}
            className={cn(
              "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg transition-[background-color,color,border-color,box-shadow]",
              isSelected
                ? "bg-surface-dim text-brand shadow-sm ring-1 ring-border-subtle dark:text-brand-light"
                : "text-muted hover:bg-surface-dim hover:text-primary"
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
