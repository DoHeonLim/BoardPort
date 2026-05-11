/**
 * File Name : features/boardgame/components/catalog/BoardGameCatalogListContainer.tsx
 * Description : 보드게임 도감 목록 Query 렌더링 컨테이너
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.08  임도헌   Created   HydrationBoundary 아래에서 도감 목록 Query 캐시 사용
 */

"use client";

import BoardGameCatalogCard from "@/features/boardgame/components/catalog/BoardGameCatalogCard";
import BoardGamePagination from "@/features/boardgame/components/catalog/BoardGamePagination";
import { useBoardGameCatalogQuery } from "@/features/boardgame/hooks/useBoardGameCatalogQuery";
import type { BoardGameCatalogFilters } from "@/features/boardgame/types/catalog";

interface BoardGameCatalogListContainerProps {
  page: number;
  limit: number;
  filters: BoardGameCatalogFilters;
  hasActiveFilters: boolean;
}

/**
 * 공개 보드게임 목록과 페이지네이션 렌더링
 *
 * @param props - 현재 페이지, 페이지 크기, 필터 상태
 * @returns 공개 도감 목록 섹션
 */
export default function BoardGameCatalogListContainer({
  page,
  limit,
  filters,
  hasActiveFilters,
}: BoardGameCatalogListContainerProps) {
  const { items, total, totalPages } = useBoardGameCatalogQuery({
    page,
    limit,
    filters,
  });

  return (
    <>
      <section className="mt-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-primary">
            {filters.query ? `"${filters.query}" 검색 결과` : "등록된 게임"}
          </h2>
          <span className="text-sm font-medium text-muted">총 {total}개</span>
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-surface p-8 text-center">
            <p className="text-sm font-bold text-primary">
              {hasActiveFilters
                ? "조건에 맞는 게임을 찾지 못했습니다."
                : "아직 공개된 게임 정보가 없습니다."}
            </p>
            <p className="mt-2 text-sm text-muted">
              {hasActiveFilters
                ? "검색어를 바꾸거나 필터를 줄여 다시 확인해보세요."
                : "공개된 도감 정보가 준비되면 이곳에서 확인할 수 있습니다."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <BoardGameCatalogCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>

      <BoardGamePagination
        page={page}
        totalPages={totalPages}
        filters={filters}
      />
    </>
  );
}
