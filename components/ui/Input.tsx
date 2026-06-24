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
 * 2026.03.26  임도헌   Modified  textarea 하단 우측 resize affordance를 강화해 모바일에서도 크기 조절 가능성을 더 잘 드러냄
 * 2026.03.27  임도헌   Modified  textarea 기본 리사이저와 커스텀 affordance가 중복되지 않도록 브라우저 기본 핸들 표시 정리
 * 2026.04.04  임도헌   Modified  forwardRef export 주석을 보강해 input/textarea 공용 정책을 더 명확히 정리
 * 2026.04.06  임도헌   Modified  textarea 높이를 입력 내용에 맞춰 자동 조절해 페이지형 설명 입력 UX 보강
 * 2026.04.13  임도헌   Modified  비밀번호 토글 아이콘은 유지하면서 터치 영역만 44px로 확장해 모바일 접근성을 보강
 * 2026.04.18  임도헌   Modified  textarea는 자동 높이 조절을 기본 동작으로 삼고 커스텀 resize affordance를 제거해 표현과 동작을 일치시킴
 * 2026.05.30  임도헌   Modified  작성형 폼 compact 밀도를 위한 density 옵션 추가
 */
"use client";

import React, {
  ForwardedRef,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";

interface IInputProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  label?: string;
  errors?: string[];
  icon?: React.ReactNode;
  passwordToggle?: boolean;
  passwordToggleLabels?: { show?: string; hide?: string };
  density?: "default" | "compact";
}

/**
 * input과 textarea를 같은 검증/에러/스타일 규칙으로 감싸는 공용 폼 필드 컴포넌트
 *
 * - input/textarea 단일 인터페이스 제공
 * - 비밀번호 표시 전환 지원
 * - number 스피너 억제와 textarea affordance 공통 처리
 *
 * @param {IInputProps} props - 라벨, 에러, 아이콘, 입력 타입을 포함한 필드 설정
 * @param {ForwardedRef<HTMLInputElement | HTMLTextAreaElement>} ref - 실제 input/textarea 참조
 * @returns {JSX.Element} 공용 폼 필드
 */
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
    density = "default",
    ...rest
  }: IInputProps,
  ref: ForwardedRef<HTMLInputElement | HTMLTextAreaElement>
) => {
  const filteredErrors = errors.filter(Boolean);
  const autoId = useId();
  const inputId = id ?? (name ? `${name}-${autoId}` : `input-${autoId}`);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canToggle = passwordToggle && type === "password";
  const [revealed, setRevealed] = useState(false);

  const resizeTextarea = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return;

    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, []);

  const setTextareaRefs = useCallback(
    (element: HTMLTextAreaElement | null) => {
      textareaRef.current = element;

      if (typeof ref === "function") {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }

      resizeTextarea(element);
    },
    [ref, resizeTextarea]
  );

  useEffect(() => {
    if (type !== "textarea") return;
    resizeTextarea(textareaRef.current);
  }, [resizeTextarea, rest.defaultValue, rest.value, type]);

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
        <div className="relative">
          <textarea
            id={inputId}
            ref={setTextareaRefs}
            name={name}
            className={cn(
              "input-primary resize-none p-3",
              density === "compact"
                ? "min-h-28 sm:min-h-[120px]"
                : "min-h-[120px]",
              filteredErrors.length > 0 && "ring-2 ring-danger/50",
              className
            )}
            aria-invalid={filteredErrors.length > 0 ? "true" : "false"}
            onInput={(event) => {
              resizeTextarea(event.currentTarget);
              rest.onInput?.(event);
            }}
            {...rest}
          />
        </div>
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
            "input-primary w-full",
            density === "compact" ? "h-11 sm:h-input-md" : "h-input-md",
            icon ? "pl-11" : "pl-4",
            canToggle ? "pr-12" : "pr-4",
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
            className="focus-ring-soft absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors hover:text-primary"
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
          className="text-xs text-danger font-medium pl-1"
        >
          {error}
        </span>
      ))}
    </div>
  );
};

export default forwardRef(Input);
