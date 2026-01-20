/**
 * File Name : features/stream/components/StreamDetail/StreamDescription.tsx
 * Description : 스트리밍 설명(접기/펼치기, 그라데이션 페이드)
 * Author : 임도헌
 *
 * History
 * 2025.07.31  임도헌   Created   컴포넌트 분리
 * 2025.09.09  임도헌   Modified  aria-expanded/controls, 개행 보존
 * 2025.09.15  임도헌   Modified  line-clamp 기반 접기/펼치기 + 페이드/피드백 버튼 UI
 * 2025.11.16  임도헌   Modified  compact/줄수/여백/className 확장
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 */

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface StreamDescriptionProps {
  description?: string | null;
  /** 접힌 상태에서 보여줄 줄 수 (기본 2줄 = compact에 최적) */
  collapsedLines?: 2 | 3 | 4 | 5;
  /** 컴팩트 모드(상단/하단 여백 축소) */
  compact?: boolean;
  /** 버튼 문구 커스터마이즈 */
  expandLabel?: string;
  collapseLabel?: string;
  className?: string;
}

export default function StreamDescription({
  description,
  collapsedLines = 2,
  compact = true,
  expandLabel = "더보기",
  collapseLabel = "접기",
  className = "",
}: StreamDescriptionProps) {
  const contentId = useId();
  const desc = (description ?? "").trim();
  const [expanded, setExpanded] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (expanded) {
      setIsOverflow(true);
      return;
    }
    const t = setTimeout(() => {
      if (!el) return;
      setIsOverflow(el.scrollHeight - 1 > el.clientHeight);
    }, 0);
    return () => clearTimeout(t);
  }, [desc, collapsedLines, expanded]);

  if (!desc) return null;

  const clampClass =
    collapsedLines === 5
      ? "line-clamp-5"
      : collapsedLines === 4
        ? "line-clamp-4"
        : collapsedLines === 3
          ? "line-clamp-3"
          : "line-clamp-2";

  return (
    <div className={cn(compact ? "mb-2" : "mb-3", "relative")}>
      <div
        id={contentId}
        ref={ref}
        className={cn(
          "whitespace-pre-line break-words text-sm",
          "text-primary", // [Fix] text-neutral-800 -> text-primary
          expanded ? "" : clampClass,
          className
        )}
      >
        {desc}
      </div>

      {/* 페이드 효과 (다크모드 대응) */}
      {!expanded && isOverflow && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -bottom-0 h-8 bg-gradient-to-t from-surface to-transparent"
        />
      )}

      {isOverflow && (
        <div className={cn("flex justify-end", compact ? "mt-1" : "mt-2")}>
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={contentId}
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-primary transition-colors underline underline-offset-2"
          >
            {expanded ? collapseLabel : expandLabel}
          </button>
        </div>
      )}
    </div>
  );
}
