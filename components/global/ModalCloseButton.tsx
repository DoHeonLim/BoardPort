/**
 * File Name : components/global/ModalCloseButton.tsx
 * Description : 모달·시트용 공용 닫기 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.13  임도헌   Created   콜백 기반 닫기 버튼의 크기·색상·접근성 스타일 통일
 */

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface ModalCloseButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> {
  label?: string;
}

/** 모달·시트 내부의 콜백 기반 닫기 버튼 */
const ModalCloseButton = forwardRef<HTMLButtonElement, ModalCloseButtonProps>(
  ({ label = "모달 닫기", className, ...props }, ref) => (
    <button
      {...props}
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "focus-ring-soft inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      <XMarkIcon className="size-6" aria-hidden="true" />
    </button>
  )
);

ModalCloseButton.displayName = "ModalCloseButton";

export default ModalCloseButton;
