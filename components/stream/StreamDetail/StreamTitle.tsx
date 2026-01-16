/**
 * File Name : components/stream/streamDetail/StreamTitle
 * Description : 스트리밍 작성자 아바타 및 제목 출력 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.31  임도헌   Created   컴포넌트 분리
 * 2025.09.09  임도헌   Modified  제목 시맨틱(<h1>), 긴 제목 가독성(break/line-clamp), 툴팁/널가드
 * 2025.11.16  임도헌   Modified  compact/size/className 확장, 여백 축소
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 (text-primary)
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
