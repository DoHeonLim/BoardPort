/**
 * File Name : components/ui/Select.tsx
 * Description : 공통 Select 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.12.15  임도헌   Created
 * 2024.12.15  임도헌   Modified  셀렉트 컴포넌트 추가
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 화살표 아이콘 커스텀
 * 2026.01.16  임도헌   Moved     components/common -> components/ui
 * 2026.04.04  임도헌   Modified  forwardRef export 주석을 보강해 공용 select 역할을 더 명확히 정리
 */
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  errors?: string[];
}

/**
 * 브라우저 기본 화살표를 걷어내고 공용 스타일/에러 규칙을 적용한 select 필드 컴포넌트
 *
 * - 커스텀 chevron 아이콘 적용
 * - input 계열과 같은 폼 문법 유지
 * - 에러 메시지와 라벨 공통 처리
 *
 * @param {SelectProps} props - 라벨, 에러, option 목록을 포함한 select 설정
 * @param {React.ForwardedRef<HTMLSelectElement>} ref - 실제 select 요소 참조
 * @returns {JSX.Element} 공용 select 필드
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, errors, children, className, ...rest }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-primary">{label}</label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "input-primary h-input-md w-full pr-10 bg-surface cursor-pointer",
              className
            )}
            // 브라우저 기본 화살표 강제 제거
            style={{
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              backgroundImage: "none", // 일부 브라우저 배경 이미지 제거
            }}
            {...rest}
          >
            {children}
          </select>

          {/* Custom Chevron Icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="size-5"
            >
              <path
                fillRule="evenodd"
                d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>

        {errors?.map((error, idx) => (
          <span key={idx} className="text-xs text-danger pl-1">
            {error}
          </span>
        ))}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
