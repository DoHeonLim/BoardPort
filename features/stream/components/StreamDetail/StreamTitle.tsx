/**
 * File Name : features/stream/components/StreamDetaill/StreamTitle.tsx
 * Description : 스트리밍 작성자 아바타 및 제목 출력 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.31  임도헌   Created   컴포넌트 분리
 * 2025.09.09  임도헌   Modified  제목 시맨틱(<h1>), 긴 제목 가독성(break/line-clamp), 툴팁/널가드
 * 2025.11.16  임도헌   Modified  compact/size/className 확장, 여백 축소
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 (text-primary)
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

"use client";

import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

interface StreamTitleProps {
  title?: string | null;
  /** 라인 높이 & 글자 크기/여백을 줄이는 모드 */
  compact?: boolean;
  /** 글자 크기 프리셋 */
  size?: Size;
  className?: string;
}

/**
 * 방송 제목을 표시합니다.
 * 긴 제목은 자동으로 줄바꿈(break-words) 및 말줄임(line-clamp) 처리됩니다.
 */
export default function StreamTitle({
  title,
  compact = false,
  size = "md",
  className = "",
}: StreamTitleProps) {
  const safeTitle = title?.trim() || "(제목 없음)";

  const sizeClass =
    size === "lg"
      ? "text-lg md:text-xl"
      : size === "sm"
        ? "text-sm md:text-base"
        : "text-base md:text-lg";

  return (
    <h1
      className={cn(
        compact ? "mb-1" : "mb-2",
        "max-w-full break-words font-bold leading-tight",
        "text-primary",
        sizeClass,
        "line-clamp-2",
        className
      )}
      title={safeTitle}
    >
      {safeTitle}
    </h1>
  );
}
