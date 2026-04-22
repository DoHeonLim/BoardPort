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
 * 2026.04.14  임도헌   Modified  select 내부 좌측 여백과 label htmlFor/id 연결을 보강해 모바일 폼 가독성과 접근성을 개선
 * 2026.04.14  임도헌   Modified  공용 select 주석을 현재 여백/접근성 정책 기준으로 간결하게 정리
 */
import { forwardRef, useId } from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  errors?: string[];
}

/**
 * 공용 폼 규칙을 따르는 select 필드 컴포넌트
 *
 * - 기본 화살표를 제거하고 커스텀 chevron을 사용
 * - input 계열과 같은 여백/에러 문법을 유지
 * - 자동 id를 생성해 label htmlFor 연결을 보장
 *
 * @param {SelectProps} props - 라벨, 에러, option 목록을 포함한 select 설정
 * @param {React.ForwardedRef<HTMLSelectElement>} ref - 실제 select 요소 참조
 * @returns {JSX.Element} 공용 select 필드
 */
const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, errors = [], children, className, id, name, ...rest }, ref) => {
    const autoId = useId();
    const selectId = id ?? (name ? `${name}-${autoId}` : `select-${autoId}`);
    const filteredErrors = errors.filter(Boolean);

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="text-sm font-medium text-primary"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            className={cn(
              "input-primary h-input-md w-full bg-surface cursor-pointer pl-4 pr-10 text-base md:text-sm",
              filteredErrors.length > 0 && "ring-2 ring-danger/50",
              className
            )}
            aria-invalid={filteredErrors.length > 0 ? "true" : "false"}
            // 브라우저 기본 화살표를 제거해 커스텀 chevron만 노출
            style={{
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              backgroundImage: "none",
            }}
            name={name}
            {...rest}
          >
            {children}
          </select>

          {/* Custom chevron */}
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

        {filteredErrors.map((error, idx) => (
          <span key={idx} className="text-xs text-danger font-medium pl-1">
            {error}
          </span>
        ))}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
