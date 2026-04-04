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
 * 2026.03.13  임도헌   Modified  returnTo 쿼리를 우선 복귀 경로로 선택할 수 있도록 보강하고 appbar 톤을 flat 헤더 기준으로 정리
 * 2026.03.14  임도헌   Modified  SPA 전환 시 document.referrer가 비어도 내부 히스토리가 있으면 router.back()을 우선 사용하도록 보완
 * 2026.03.18  임도헌   Modified  공통 뒤로가기에서도 returnTo/fallbackHref를 정규화하고 referrer 파싱 예외를 방어
 * 2026.04.02  임도헌   Modified  appbar 변형의 보더·링 대비를 조정해 라이트모드 헤더 위에서도 윤곽이 흐려지지 않도록 정리
 */
"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { cn } from "@/lib/utils";

type Props = {
  fallbackHref?: string; // 히스토리 없을 때 이동할 안전 경로
  useReturnTo?: boolean; // 현재 URL의 returnTo 쿼리를 우선 복귀 경로로 사용할지 여부
  variant?: "appbar" | "inline"; // appbar: 상단바(배경O), inline: 컨텐츠 내(배경X)
  label?: string;
  className?: string;
};

export default function BackButton({
  fallbackHref = "/",
  useReturnTo = false,
  variant = "appbar",
  label = "뒤로가기",
  className = "",
}: Props) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);
  const [resolvedFallbackHref, setResolvedFallbackHref] =
    useState(sanitizeCallbackUrl(fallbackHref));

  useEffect(() => {
    // 히스토리 길이로 1차 판단
    setCanGoBack(window.history.length > 1);

    if (useReturnTo) {
      // 공통 뒤로가기도 현재 URL의 returnTo를 내부 경로 기준으로만 복원
      const rawReturnTo = new URLSearchParams(window.location.search).get(
        "returnTo"
      );
      setResolvedFallbackHref(
        rawReturnTo != null
          ? sanitizeCallbackUrl(rawReturnTo)
          : sanitizeCallbackUrl(fallbackHref)
      );
    } else {
      setResolvedFallbackHref(sanitizeCallbackUrl(fallbackHref));
    }
  }, [fallbackHref, useReturnTo]);

  const handleClick = () => {
    let hasExternalReferrer = false;
    if (document.referrer) {
      try {
        hasExternalReferrer =
          new URL(document.referrer).origin !== window.location.origin;
      } catch {
        hasExternalReferrer = false;
      }
    }

    if (canGoBack && !hasExternalReferrer) {
      router.back();
    } else {
      router.push(resolvedFallbackHref);
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
          "border border-border/80 dark:border-border-subtle",
          "bg-background/92 text-primary shadow-sm backdrop-blur-sm",
          "ring-1 ring-black/5 dark:ring-white/5",
          "hover:bg-surface hover:border-border dark:hover:bg-surface-dim"
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
