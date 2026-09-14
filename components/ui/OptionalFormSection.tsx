/**
 * File Name : components/ui/OptionalFormSection.tsx
 * Description : 선택 입력을 접어서 보여주는 공용 폼 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.12  임도헌   Created   필수 입력 이후 선택 항목을 단계적으로 노출하는 공용 섹션 추가
 * 2026.09.12  임도헌   Modified  검증 오류 등 외부 상태에서 섹션을 열 수 있도록 제어형 동작 지원
 */

"use client";

import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useState, type ReactNode, type SyntheticEvent } from "react";

interface OptionalFormSectionProps {
  title: string;
  description: string;
  status?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

/** 선택 입력의 요약과 세부 필드를 네이티브 disclosure로 제공 */
export default function OptionalFormSection({
  title,
  description,
  status,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
}: OptionalFormSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = open ?? internalOpen;

  const handleToggle = (event: SyntheticEvent<HTMLDetailsElement>) => {
    const nextOpen = event.currentTarget.open;
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <details
      className="group overflow-hidden rounded-xl border border-border-subtle bg-surface"
      open={isOpen}
      onToggle={handleToggle}
    >
      <summary className="focus-ring-soft flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-dim/60 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
            {title}
            <span className="text-xs font-normal text-muted">(선택)</span>
          </span>
          <span className="mt-0.5 block truncate text-xs text-muted">
            {status || description}
          </span>
        </span>
        <ChevronDownIcon
          className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>

      <div className="flex flex-col gap-4 border-t border-border-subtle bg-surface-dim/20 p-4">
        {children}
      </div>
    </details>
  );
}
