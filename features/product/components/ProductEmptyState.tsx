/**
 * File Name : features/product/components/ProductEmptyState.tsx
 * Description : 제품 목록 빈 상태 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.06.07  임도헌   Created   최초 생성
 * 2026.01.12  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/product -> features/product/components
 * 2026.01.27  임도헌   Modified  주석 설명 보강
 */
"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";

interface ProductEmptyStateProps {
  hasSearchParams: boolean;
}

/**
 * 제품 목록이 비어있을 때 표시되는 UI
 * 검색 결과가 없는 경우와 초기 등록된 제품이 없는 경우를 구분하여 메시지를 표시합니다.
 *
 * @param {boolean} hasSearchParams - 검색 조건(키워드/필터) 존재 여부
 */
export default function ProductEmptyState({
  hasSearchParams,
}: ProductEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
      <div className="p-4 rounded-full bg-surface-dim text-muted/50">
        <MagnifyingGlassIcon className="size-10" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-lg font-medium text-primary">
          {hasSearchParams
            ? "검색 결과가 없습니다."
            : "등록된 제품이 없습니다."}
        </p>
        {hasSearchParams && (
          <p className="text-sm text-muted">다른 검색어로 다시 시도해보세요.</p>
        )}
      </div>
    </div>
  );
}
