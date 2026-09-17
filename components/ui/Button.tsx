/**
 * File Name : components/ui/Button.tsx
 * Description : 폼 버튼 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.01  임도헌   Created
 * 2024.10.01  임도헌   Modified  button 컴포넌트 추가
 * 2024.10.04  임도헌   Modified  useFormStatus 추가
 * 2024.12.10  임도헌   Modified  disabled 추가
 * 2024.12.19  임도헌   Modified  shrink-0 추가
 * 2025.07.11  임도헌   Modified  text size 반응형으로 변경
 * 2026.01.10  임도헌   Modified  [Rule 3.2] Touch Target 48px, [Rule 5.1] 시맨틱 클래스 적용
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 * 2026.04.04  임도헌   Modified  export 주석을 보강해 폼 제출 버튼의 공용 pending 동작을 명확히 정리
 * 2026.09.12  임도헌   Modified  클라이언트 비동기 제출 상태와 문맥별 진행 문구 지원
 * 2026.09.13  임도헌   Modified  주요 버튼의 의미와 크기를 표현하는 variant·size 옵션 추가
 */
"use client";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

interface IButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  size?: "sm" | "md";
}

const variantClasses = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  danger:
    "focus-ring-strong bg-danger text-white hover:bg-red-600 disabled:bg-neutral-400 disabled:text-neutral-300 dark:disabled:bg-neutral-600 dark:disabled:text-neutral-400",
  success:
    "focus-ring-strong bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-neutral-400 disabled:text-neutral-300 dark:disabled:bg-neutral-600 dark:disabled:text-neutral-400",
} as const;

const sizeClasses = {
  sm: "h-10 px-4 text-sm",
  md: "h-input-md px-4 text-base",
} as const;

/**
 * react-dom form pending 상태를 자동 반영하는 공용 제출 버튼 컴포넌트
 *
 * - form pending 상태 반영
 * - 공용 로딩 스피너 표시
 * - 기본 제출 버튼 문법 통일
 *
 * @param {IButtonProps} props - 버튼 문구와 disabled 상태를 포함한 기본 버튼 속성
 * @returns {JSX.Element} 공용 제출 버튼
 */
export default function Button({
  text,
  disabled,
  loading = false,
  loadingText = "로딩 중...",
  variant = "primary",
  size = "md",
  className,
  ...rest
}: IButtonProps) {
  const { pending } = useFormStatus();
  const isLoading = pending || loading;
  const isDisabled = isLoading || disabled;

  return (
    <button
      disabled={isDisabled}
      aria-busy={isLoading}
      className={cn(
        "inline-flex w-full items-center justify-center gap-2 rounded-xl font-medium transition-colors motion-safe:transition-transform motion-safe:duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <span
            aria-hidden="true"
            className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          />
          <span>{loadingText}</span>
        </span>
      ) : (
        text
      )}
    </button>
  );
}
