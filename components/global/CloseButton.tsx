/**
 * File Name : components/global/CloseButton.tsx
 * Description : 닫기 버튼 (접근성 및 터치 영역 확보)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.22  임도헌   Created
 * 2024.10.22  임도헌   Modified  close-button 컴포넌트 추가
 * 2024.12.29  임도헌   Modified  z-index 추가
 * 2025.05.10  임도헌   Modified  스타일 변경
 * 2025.06.15  임도헌   Modified  href 속성 추가
 * 2025.11.13  임도헌   Modified  router.back 가능시 back, 불가시 fallbackHref/returnTo로 push
 * 2026.01.10  임도헌   Modified  터치 타겟(44px) 확보 및 시맨틱 스타일 적용
 * 2026.01.16  임도헌   Moved     components/common -> components/global
 * 2026.03.06  임도헌   Modified  hover 배경을 공용 시맨틱 토큰(bg-surface-dim) 기준으로 정리
 */
"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** 폴백 경로. 보통 "/products" */
  fallbackHref?: string;
  /** 우선순위가 가장 높은 복귀 경로. 없으면 searchParams의 returnTo, 그마저 없으면 fallbackHref */
  returnTo?: string;
  /** aria-label 지정 */
  label?: string;
  className?: string;
}

export default function CloseButton({
  fallbackHref = "/products",
  returnTo,
  label = "닫기",
  className,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const resolvedReturnTo = returnTo || sp.get("returnTo") || fallbackHref;

  const onClose = useCallback(() => {
    // Parallel/Intercepting Route 환경에서는 back()보다 명시 경로 replace가 안정적
    router.replace(resolvedReturnTo);
  }, [router, resolvedReturnTo]);

  // ESC로 닫기
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className={cn(
        // [기본] 중앙 정렬, 원형
        "flex items-center justify-center rounded-full transition-colors",
        // [크기] 터치 타겟 확보 (40px ~ 44px)
        "size-10 sm:size-11",
        // [색상] 배경색: Surface Dim (연한 회색/어두운 회색) -> 호버 시 진하게
        "bg-surface-dim hover:bg-border/80",
        // [아이콘] 기본 Muted -> 호버 시 Primary
        "text-muted hover:text-primary",
        // [포커스] 접근성 포커스 링
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand",
        className
      )}
    >
      <XMarkIcon className="size-6" />
    </button>
  );
}
