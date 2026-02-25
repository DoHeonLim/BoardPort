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
 * 2026.02.21  임도헌   Modified  currentRange Prop 추가
 */
"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import KeywordAlertButton from "@/features/notification/components/KeywordAlertButton";
import type { RegionRange } from "@/generated/prisma/enums";

interface ProductEmptyStateProps {
  hasSearchParams: boolean;
  keyword?: string;
  alertId?: number;
  currentRange: RegionRange;
}

/**
 * 제품 목록이 비어있을 때 표시되는 UI
 *
 * - 검색어(keyword)가 있다면 `KeywordAlertButton`을 제공하여 키워드 등록을 유도함
 * - 유저가 현재 탐색 중인 지역 범위(`currentRange`)를 버튼에 전달하여 의도에 맞는 범위 등록 지원
 *
 * @param hasSearchParams - 검색 필터 적용 여부
 * @param keyword - 현재 검색 중인 키워드
 * @param alertId - 해당 키워드의 알림 등록 ID (등록 상태 확인용)
 * @param currentRange - 현재 탐색 중인 지역 필터 범위
 */
export default function ProductEmptyState({
  hasSearchParams,
  keyword,
  alertId,
  currentRange,
}: ProductEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 animate-fade-in">
      <div className="p-4 rounded-full bg-surface-dim border border-border text-muted/50 dark:bg-surface dark:border-brand/20">
        <MagnifyingGlassIcon className="size-10" />
      </div>

      <div className="text-center space-y-1 mb-4">
        <p className="text-lg font-bold text-primary">
          {hasSearchParams
            ? "검색 결과가 없습니다."
            : "등록된 제품이 없습니다."}
        </p>
        {hasSearchParams && (
          <p className="text-sm text-muted">다른 검색어로 다시 시도해보세요.</p>
        )}
      </div>

      {/* 키워드 검색 중이지만 결과가 없을 때 -> 알림 등록 유도 */}
      {keyword && (
        <div className="flex flex-col items-center gap-2 mt-2 p-4 rounded-xl bg-surface-dim/30 border border-dashed border-border">
          <p className="text-xs text-muted font-medium">
            이 키워드로 새 상품이 등록되면 알려드릴까요?
          </p>
          <KeywordAlertButton
            keyword={keyword}
            alertId={alertId}
            currentRange={currentRange} // 주입
          />
        </div>
      )}
    </div>
  );
}
