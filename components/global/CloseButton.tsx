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
 * 2026.03.09  임도헌   Modified  모달 닫기 시 history back 우선 처리 옵션 추가
 * 2026.03.18  임도헌   Modified  공통 닫기 버튼에서도 returnTo/fallbackHref를 정규화해 raw 쿼리 재사용 예외를 방지
 * 2026.08.27  임도헌   Modified  상위 모달 포커스 관리자가 Escape를 담당할 때 중복 리스너를 끄는 옵션 추가
 */
"use client";

import { XMarkIcon } from "@heroicons/react/24/solid";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useCallback } from "react";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { cn } from "@/lib/utils";

interface Props {
  /** 폴백 경로. 보통 "/products" */
  fallbackHref?: string;
  /** 우선순위가 가장 높은 복귀 경로. 없으면 searchParams의 returnTo, 그마저 없으면 fallbackHref */
  returnTo?: string;
  /** aria-label 지정 */
  label?: string;
  className?: string;
  /** 인터셉트 모달처럼 직전 히스토리 복귀가 더 자연스러운 경우 back()을 우선 사용 */
  preferHistoryBack?: boolean;
  /** 상위 모달 포커스 관리자가 Escape를 처리하면 false로 지정 */
  closeOnEscape?: boolean;
}

export default function CloseButton({
  fallbackHref = "/products",
  returnTo,
  label = "닫기",
  className,
  preferHistoryBack = false,
  closeOnEscape = true,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  // 공통 닫기 동작도 searchParams의 raw returnTo가 아닌 정규화된 내부 경로만 사용
  const resolvedReturnTo = sanitizeCallbackUrl(
    returnTo || sp.get("returnTo") || fallbackHref
  );

  const onClose = useCallback(() => {
    if (preferHistoryBack && window.history.length > 1) {
      router.back();
      return;
    }

    router.replace(resolvedReturnTo);
  }, [preferHistoryBack, router, resolvedReturnTo]);

  // ESC로 닫기
  useEffect(() => {
    if (!closeOnEscape) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOnEscape, onClose]);

  return (
    <button
      type="button"
      onClick={onClose}
      aria-label={label}
      className={cn(
        "flex items-center justify-center rounded-full transition-colors",
        "size-10 sm:size-11",
        "bg-surface-dim hover:bg-border/80",
        "text-muted hover:text-primary",
        "focus-ring-soft",
        className
      )}
    >
      <XMarkIcon className="size-6" />
    </button>
  );
}
