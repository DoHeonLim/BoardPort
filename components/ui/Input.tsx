/**
 * File Name : components/ui/Input.tsx
 * Description : 폼 인풋 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.10.01  임도헌   Created
 * 2024.10.01  임도헌   Modified  input 컴포넌트 추가
 * 2024.10.04  임도헌   Modified  name props 추가 및 InputHTMLAttributes<HTMLInputElement> 추가
 * 2024.11.11  임도헌   Modified  forwardRef를 사용하는 코드 추가
 * 2024.12.15  임도헌   Modified  textarea 지원 추가
 * 2024.12.24  임도헌   Modified  icon prop 추가
 * 2025.04.10  임도헌   Modified  gap-0으로 변경
 * 2025.12.10  임도헌   Modified  빈 에러 메시지 필터링으로 에러 span 렌더링 로직 개선
 * 2025.12.12  임도헌   Modified  passwordToggle 옵션 추가(비밀번호일 때만 눈 버튼 렌더링)
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 클래스 & 접근성 업데이트
 * 2026.01.11  임도헌   Modified  [UX] 스피너 제거 & 스크롤 변경 방지
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 * 2026.02.26  임도헌   Modified  autoFocus 제거
 */
"use client";

import React, { ForwardedRef, forwardRef, useId, useState } from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface IInputProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  errors?: string[];
  icon?: React.ReactNode;
  passwordToggle?: boolean;
  passwordToggleLabels?: { show?: string; hide?: string };
}

const Input = (
  {
    errors = [],
    name,
    type = "text",
    className = "",
    icon,
    passwordToggle = false,
    passwordToggleLabels,
    id,
    ...rest
  }: IInputProps,
  ref: ForwardedRef<HTMLInputElement | HTMLTextAreaElement>
) => {
  const filteredErrors = errors.filter(Boolean);
  const autoId = useId();
  const inputId = id ?? (name ? `${name}-${autoId}` : `input-${autoId}`);

  const canToggle = passwordToggle && type === "password";
  const [revealed, setRevealed] = useState(false);

  // 스피너 제거 스타일
  const noSpinnerStyle = {
    MozAppearance: "textfield", // Firefox
  } as React.CSSProperties;

  if (type === "textarea") {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {rest.label && (
          <label className="text-sm font-medium text-primary">
            {rest.label}
          </label>
        )}
        <textarea
          id={inputId}
          ref={ref as ForwardedRef<HTMLTextAreaElement>}
          name={name}
          className={cn(
            "input-primary min-h-[120px] resize-y p-3",
            filteredErrors.length > 0 && "ring-2 ring-danger/50",
            className
          )}
          aria-invalid={filteredErrors.length > 0 ? "true" : "false"}
          {...rest}
        />
        {filteredErrors.map((error, index) => (
          <span key={index} className="text-xs text-danger font-medium pl-1">
            {error}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {/* Label */}
      {rest.label && (
        <label className="text-sm font-medium text-primary">{rest.label}</label>
      )}

      <div className="relative">
        {/* Webkit 스피너 제거용 글로벌 스타일 (필요시 globals.css로 이동 가능) */}
        <style jsx>{`
          input[type="number"]::-webkit-inner-spin-button,
          input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
        `}</style>

        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          ref={ref as ForwardedRef<HTMLInputElement>}
          type={canToggle ? (revealed ? "text" : "password") : type}
          name={name}
          aria-invalid={filteredErrors.length > 0 ? "true" : "false"}
          className={cn(
            "input-primary h-input-md w-full",
            icon ? "pl-11" : "pl-4",
            canToggle ? "pr-11" : "pr-4",
            filteredErrors.length > 0 && "ring-2 ring-danger/50",
            "text-base md:text-sm",
            className
          )}
          style={type === "number" ? noSpinnerStyle : undefined}
          // 스크롤로 숫자 변경되는 것 방지
          onWheel={(e) => type === "number" && e.currentTarget.blur()}
          {...rest}
        />

        {canToggle && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
            aria-pressed={revealed}
            aria-label={
              revealed
                ? passwordToggleLabels?.hide ?? "비밀번호 숨기기"
                : passwordToggleLabels?.show ?? "비밀번호 표시"
            }
          >
            {revealed ? (
              <EyeIcon className="size-5" />
            ) : (
              <EyeSlashIcon className="size-5" />
            )}
          </button>
        )}
      </div>

      {filteredErrors.map((error, index) => (
        <span
          key={index}
          className="text-xs text-danger font-medium pl-1 animate-fade-in"
        >
          {error}
        </span>
      ))}
    </div>
  );
};

export default forwardRef(Input);
