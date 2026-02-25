/**
 * File Name : features/product/components/SearchResultSummary.tsx
 * Description : 제품 검색 결과 요약
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   최초 생성
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 */

interface SearchResultSummaryProps {
  count: number;
  summaryText: string;
}

/**
 * 검색 결과 수와 요약 텍스트(필터 조건 등)를 표시하는 컴포넌트
 * 목록 상단에 위치
 */
export default function SearchResultSummary({
  count,
  summaryText,
}: SearchResultSummaryProps) {
  if (!summaryText) return null;

  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      <div className="flex items-center gap-2">
        <span className="font-medium text-primary">검색결과</span>
        <span className="px-2 py-0.5 text-xs font-bold bg-brand/10 text-brand dark:bg-brand-light/20 dark:text-brand-light rounded-full">
          {count}개
        </span>
      </div>
      <span className="text-muted/60">|</span>
      <span className="truncate max-w-[150px] sm:max-w-xs" title={summaryText}>
        {summaryText}
      </span>
    </div>
  );
}
