/**
 * File Name : features/boardgame/components/catalog/BoardGameCatalogListContainer.tsx
 * Description : 보드게임 도감 목록 Query 렌더링 컨테이너
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.08  임도헌   Created   HydrationBoundary 아래에서 도감 목록 Query 캐시 사용
 * 2026.05.18  임도헌   Modified  긴 도감 목록 탐색을 위해 목록 상단에도 페이지네이션 배치
 * 2026.09.11  임도헌   Modified  모바일 요약 카드 간격과 목록 밀도 조정
 * 2026.09.11  임도헌   Modified  실제 대표 이미지가 있는 첫 도감 카드를 LCP 우선 대상으로 지정
 * 2026.09.11  임도헌   Modified  모바일 첫 화면 대표 이미지 4장을 LCP 우선 대상으로 지정
 * 2026.09.12  임도헌   Modified  도감 빈 상태를 공용 상태 카드와 필터 초기화 동선으로 정리
 */

"use client";

import Link from "next/link";
import { PuzzlePieceIcon } from "@heroicons/react/24/outline";
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

const LCP_EAGER_IMAGE_COUNT = 4;

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
  const priorityItemIds = new Set(
    items
      .filter((item) => Boolean(item.imageUrl))
      .slice(0, LCP_EAGER_IMAGE_COUNT)
      .map((item) => item.id)
  );

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
          <div className="state-screen px-0 pt-4 sm:pt-8">
            <div className="state-card">
              <div className="state-icon-wrap">
                <PuzzlePieceIcon className="size-10 text-muted/50" />
              </div>
              <h3 className="state-title">
                {hasActiveFilters
                  ? "조건에 맞는 게임이 없습니다."
                  : "아직 공개된 게임 정보가 없습니다."}
              </h3>
              <p className="state-description">
                {hasActiveFilters
                  ? "검색어나 인원, 시간, 난이도 조건을 넓혀보세요."
                  : "공개된 도감 정보가 준비되면 이곳에서 확인할 수 있습니다."}
              </p>
              {hasActiveFilters && (
                <div className="state-actions justify-center">
                  <Link
                    href="/boardgames"
                    className="btn-secondary inline-flex min-h-[44px] items-center justify-center px-6 text-sm font-medium"
                  >
                    조건 초기화
                  </Link>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <BoardGamePagination
              page={page}
              totalPages={totalPages}
              filters={filters}
              placement="top"
            />
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {items.map((item) => (
                <BoardGameCatalogCard
                  key={item.id}
                  item={item}
                  isPriority={priorityItemIds.has(item.id)}
                />
              ))}
            </div>
          </>
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
