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
 */
"use client";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

interface IButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text: string;
  disabled?: boolean;
}

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
  className,
  ...rest
}: IButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = pending || disabled;

  return (
    <button
      disabled={isDisabled}
      className={cn(
        "h-input-md w-full rounded-xl font-medium text-base transition-colors motion-safe:transition-transform motion-safe:duration-150 active:scale-[0.98]",
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
