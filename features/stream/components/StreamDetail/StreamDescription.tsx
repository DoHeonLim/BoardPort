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
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.19  임도헌   Modified  스트림 상세 톤에 맞춰 더보기 버튼을 언더라인 링크형에서 보조 칩형으로 정리
 * 2026.03.20  임도헌   Modified  설명 토글 문구를 더 직접적으로 조정해 정보 카드 안에서 의미 전달을 보강
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

/**
 * 긴 텍스트 설명을 접고 펼칠 수 있는 컴포넌트
 * - 내용이 `collapsedLines`를 초과할 때만 더보기 버튼을 노출
 * - 접힌 상태에서는 하단에 그라데이션 페이드 효과를 적용
 */
export default function StreamDescription({
  description,
  collapsedLines = 2,
  compact = true,
  expandLabel = "설명 더보기",
  collapseLabel = "설명 접기",
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
          "text-primary",
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
            className={cn(
              "inline-flex min-h-[32px] items-center rounded-full border border-border-subtle bg-surface px-3 text-xs font-medium transition-colors",
              "text-muted hover:bg-surface-dim hover:text-primary"
            )}
          >
            {expanded ? collapseLabel : expandLabel}
          </button>
        </div>
      )}
    </div>
  );
}
