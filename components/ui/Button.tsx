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
 */
"use client";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

interface IButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  disabled?: boolean;
}

export default function Button({
  text,
  disabled,
  className,
  ...rest
}: IButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      disabled={isDisabled}
      className={cn(
        "h-input-md w-full rounded-xl font-medium text-base transition-all active:scale-[0.98]",
        "btn-primary", // Background & Text color
        "disabled:opacity-70 disabled:cursor-not-allowed",
        className
      )}
      {...rest}
    >
      {pending ? (
        <div className="flex items-center justify-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <span>로딩 중...</span>
        </div>
      ) : (
        text
      )}
    </button>
  );
}
