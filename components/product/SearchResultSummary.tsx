/**
 * File Name : components/product/SearchResultSummary
 * Description : 검색 결과 요약
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   최초 생성
 * 2026.01.11  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 */

interface SearchResultSummaryProps {
  count: number;
  summaryText: string;
}

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
