/**
 * File Name : components/global/BackButton.tsx
 * Description : 뒤로가기 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.11  임도헌   Created
 * 2024.12.11  임도헌   Modified  뒤로가기 버튼 컴포넌트 추가
 * 2025.04.28  임도헌   Modified  href props 추가
 * 2025.11.13  임도헌   Modified  UI 변경
 * 2025.12.02  임도헌   Modified  appbar 사이즈/반응형 조정
 * 2026.01.10  임도헌   Modified  터치 타겟(44px) 확보 및 시맨틱 스타일 적용
 * 2026.01.16  임도헌   Moved     components/common -> components/global
 * 2026.02.26  임도헌   Modified  버튼 사이즈 11로 통일
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  fallbackHref?: string; // 히스토리 없을 때 이동할 안전 경로
  variant?: "appbar" | "inline"; // appbar: 상단바(배경O), inline: 컨텐츠 내(배경X)
  label?: string;
  className?: string;
};

export default function BackButton({
  fallbackHref = "/",
  variant = "appbar",
  label = "뒤로가기",
  className = "",
}: Props) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // 히스토리 길이로 1차 판단
    setCanGoBack(window.history.length > 1);
  }, []);

  const handleClick = () => {
    if (
      canGoBack &&
      document.referrer &&
      new URL(document.referrer).origin === window.location.origin
    ) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  const base = cn(
    "inline-flex items-center justify-center rounded-xl transition active:scale-[.98]",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
  );

  const styles =
    variant === "appbar"
      ? cn(
          // [Appbar] 배경 있음, 테두리 있음
          "h-11 w-11 shrink-0",
          "border border-border",
          "bg-surface/80 backdrop-blur text-primary",
          "hover:bg-surface-dim"
        )
      : cn(
          // [Inline] 배경 없음, 텍스트만
          "h-11 px-2 text-sm font-medium transition-colors",
          "text-muted hover:text-gray-900 dark:hover:text-white"
        );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(base, styles, className)}
      aria-label={label}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 20 20"
        aria-hidden="true"
        className="fill-current"
      >
        <path d="M12.7 4.7a1 1 0 0 1 0 1.4L9.8 9l2.9 2.9a1 1 0 1 1-1.4 1.4l-3.6-3.6a1 1 0 0 1 0-1.4l3.6-3.6a1 1 0 0 1 1.4 0z" />
      </svg>
      {variant === "inline" && <span className="ml-1">뒤로</span>}
    </button>
  );
}
