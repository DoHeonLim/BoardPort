/**
 * File Name : features/stream/components/StreamDetail/StreamCategoryTags.tsx
 * Description : 스트리밍 카테고리 및 태그 뱃지 출력
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.31  임도헌   Created   컴포넌트 분리
 * 2025.09.09  임도헌   Modified  공백/중복 태그 정리, a11y(role=group), 아이콘 공백 처리
 * 2025.09.15  임도헌   Modified  inline/compact 옵션 추가(한 줄 섞어쓰기 & 작은 pill), 불필요한 mb 제거
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 뱃지 스타일 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { useMemo } from "react";
import { StreamCategory, StreamTag } from "@/features/stream/types";
import { cn } from "@/lib/utils";

interface StreamCategoryTagsProps {
  category?: Pick<StreamCategory, "kor_name" | "icon">;
  tags?: Pick<StreamTag, "name">[];
  /** 제목 밑 메타줄 등에서 한 줄로 섞어쓰고 싶을 때 */
  inline?: boolean;
  /** pill을 작게 */
  compact?: boolean;
}

/**
 * 방송 카테고리와 태그(#)를 뱃지 형태로 나열하는 컴포넌트
 * 중복된 태그는 제거하고 정규화하여 표시합니다.
 */
export default function StreamCategoryTags({
  category,
  tags,
  inline = false,
  compact = true,
}: StreamCategoryTagsProps) {
  const normalizedTags = useMemo(() => {
    const arr = (tags ?? []).map((t) => (t?.name ?? "").trim()).filter(Boolean);
    return Array.from(new Set(arr)); //중복 제거
  }, [tags]);

  const categoryLabel = category
    ? `${category.icon ? `${category.icon} ` : ""}${category.kor_name}`
    : null;

  const wrapClass = inline
    ? "inline-flex flex-wrap items-center gap-1.5"
    : "flex flex-wrap items-center gap-1.5";

  const sizeClass = compact ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";

  return (
    <div className={wrapClass} role="group" aria-label="카테고리 및 태그">
      {categoryLabel && (
        <span
          className={cn(
            "rounded-md font-medium transition-colors",
            "bg-brand/10 text-brand dark:bg-brand-light/20 dark:text-brand-light",
            sizeClass
          )}
          title={categoryLabel}
        >
          {categoryLabel}
        </span>
      )}

      {normalizedTags.map((name) => (
        <span
          key={name}
          className={cn(
            "rounded-md font-medium transition-colors",
            "bg-surface-dim text-muted border border-border",
            sizeClass
          )}
          title={`#${name}`}
        >
          #{name}
        </span>
      ))}
    </div>
  );
}
