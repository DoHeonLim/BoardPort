/**
 * File Name : app/(app)/boardgames/page.tsx
 * Description : 로그인 후 보드게임 카탈로그 목록 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   PUBLISHED 보드게임 목록과 검색 화면 추가
 * 2026.05.02  임도헌   Modified  공개 조건과 페이지네이션 helper 주석 정리
 * 2026.05.03  임도헌   Modified  카탈로그 인원/시간/난이도 필터 및 정렬 UI 추가
 * 2026.05.03  임도헌   Modified  오래된 seed 랭킹 전면 노출 제거 및 기본 정렬 문구 중립화
 * 2026.05.03  임도헌   Modified  목록 카드에 카테고리/메커니즘 taxonomy 칩 노출
 * 2026.05.03  임도헌   Modified  다크모드 taxonomy 칩 대비 보강
 * 2026.05.03  임도헌   Modified  필터 초기화 시 uncontrolled 입력 요소가 함께 초기화되도록 폼 remount key 추가
 * 2026.05.04  임도헌   Modified  필터 초기화 액션의 다크모드 가시성 보강
 * 2026.05.04  임도헌   Modified  카탈로그 탐색 중 제품 메인으로 바로 복귀하는 헤더 액션 추가
 * 2026.05.05  임도헌   Modified  목록 카드/필터/페이지네이션 UI를 전용 컴포넌트로 분리
 * 2026.05.05  임도헌   Modified  공개 목록 조회 서비스 직접 import 경로 반영
 * 2026.05.08  임도헌   Modified  TanStack Query 서버 프리패치 및 HydrationBoundary 적용
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import BackButton from "@/components/global/BackButton";
import BoardGameCatalogListContainer from "@/features/boardgame/components/catalog/BoardGameCatalogListContainer";
import FilterSelect from "@/features/boardgame/components/catalog/FilterSelect";
import { getBoardGamesCatalogAction } from "@/features/boardgame/actions/list";
import { BOARDGAME_CATALOG_PAGE_SIZE } from "@/features/boardgame/constants";
import { parseBoardGameCatalogFilters } from "@/features/boardgame/utils/catalogFilters";
import { getQueryClient } from "@/lib/getQueryClient";
import { queryKeys } from "@/lib/queryKeys";
import {
  MagnifyingGlassIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "보드게임 도감",
  description:
    "BoardPort에서 거래와 기록에 연결되는 보드게임 정보를 찾아보세요.",
};

/**
 * 보드게임 카탈로그 목록 페이지
 *
 * - 관리자 검수를 통과한 `PUBLISHED` 한국어 데이터만 노출
 * - 짧은 설명과 검수 시각이 있는 항목만 공개 목록에 포함
 * - 인원/시간/난이도/정렬 필터를 URL query로 유지해 공유 가능한 탐색 상태 제공
 * - TanStack Query 서버 프리패치로 목록 복귀와 필터 전환 시 캐시 identity 유지
 * - 하단 탭을 추가하지 않고 항구/검색에서 진입하는 보조 탐색면으로 사용
 */
export default async function BoardGamesPage(props: {
  searchParams: Promise<{
    page?: string;
    q?: string;
    players?: string;
    playTime?: string;
    weight?: string;
    sort?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const rawPage = Number(searchParams.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const filters = parseBoardGameCatalogFilters(searchParams);
  const limit = BOARDGAME_CATALOG_PAGE_SIZE;
  const hasActiveFilters = Boolean(
    filters.query ||
    filters.players ||
    filters.playTime ||
    filters.weight ||
    (filters.sort && filters.sort !== "rank")
  );
  const filterFormKey = [
    filters.query ?? "",
    filters.players ?? "",
    filters.playTime ?? "",
    filters.weight ?? "",
    filters.sort ?? "rank",
  ].join("|");
  const queryClient = getQueryClient();

  // 서버 prefetch와 클라이언트 hook이 같은 query key를 공유하는 HydrationBoundary 기준점
  await queryClient.prefetchQuery({
    queryKey: queryKeys.boardgames.list({ page, limit, ...filters }),
    queryFn: () => getBoardGamesCatalogAction(page, limit, filters),
  });

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 pb-24 pt-4 sm:px-6 sm:pb-10">
      <header className="border-b border-border-subtle pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BackButton fallbackHref="/products" />
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-primary sm:text-2xl">
                보드게임 도감
              </h1>
              <p className="mt-1 text-sm text-muted">
                BoardPort 거래와 기록에 연결할 게임 정보를 찾아보세요.
              </p>
            </div>
          </div>
          <Link
            href="/products"
            className="focus-ring-soft inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-bold text-primary shadow-sm transition hover:border-brand/50 hover:bg-surface-dim sm:px-4"
          >
            <ShoppingBagIcon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">항구로 가기</span>
            <span className="sm:hidden">항구</span>
          </Link>
        </div>

        <form
          key={filterFormKey}
          action="/boardgames"
          className="mt-5 space-y-3"
        >
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <input
                name="q"
                defaultValue={filters.query ?? ""}
                placeholder="게임명, 별칭 검색"
                className="input-primary h-12 w-full pl-10"
              />
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
            </div>
            <button type="submit" className="btn-primary h-12 px-5 font-bold">
              검색
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <FilterSelect
              name="players"
              label="인원"
              value={filters.players ?? ""}
              options={[
                { value: "", label: "전체 인원" },
                { value: "solo", label: "1인 가능" },
                { value: "two", label: "2인 추천" },
                { value: "threeFour", label: "3-4인" },
                { value: "group", label: "5인 이상" },
              ]}
            />
            <FilterSelect
              name="playTime"
              label="시간"
              value={filters.playTime ?? ""}
              options={[
                { value: "", label: "전체 시간" },
                { value: "short", label: "30분 이하" },
                { value: "standard", label: "31-90분" },
                { value: "long", label: "90분 이상" },
              ]}
            />
            <FilterSelect
              name="weight"
              label="난이도"
              value={filters.weight ?? ""}
              options={[
                { value: "", label: "전체 난이도" },
                { value: "light", label: "가벼움" },
                { value: "medium", label: "보통" },
                { value: "heavy", label: "전략" },
              ]}
            />
            <FilterSelect
              name="sort"
              label="정렬"
              value={filters.sort ?? "rank"}
              options={[
                { value: "rank", label: "도감 기본순" },
                { value: "rating", label: "평점순" },
                { value: "popular", label: "평가 많은 순" },
                { value: "newest", label: "신작순" },
              ]}
            />
          </div>

          {hasActiveFilters ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-dim px-3 py-2">
              <p className="text-xs font-bold text-muted">
                검색 조건이 적용되어 있습니다.
              </p>
              <Link
                href="/boardgames"
                className="focus-ring-soft inline-flex h-8 shrink-0 items-center justify-center rounded-lg border border-brand/35 bg-brand/10 px-3 text-xs font-bold text-brand-dark transition-colors hover:border-brand/60 hover:bg-brand/15 dark:border-brand-light/45 dark:bg-brand-light/15 dark:text-white dark:hover:bg-brand-light/20"
              >
                초기화
              </Link>
            </div>
          ) : null}
        </form>
      </header>

      <HydrationBoundary state={dehydrate(queryClient)}>
        <Suspense fallback={<BoardGameCatalogListFallback />}>
          <BoardGameCatalogListContainer
            page={page}
            limit={limit}
            filters={filters}
            hasActiveFilters={hasActiveFilters}
          />
        </Suspense>
      </HydrationBoundary>
    </main>
  );
}

/**
 * 도감 목록 Query 로딩 fallback
 *
 * @returns 목록 영역 스켈레톤
 */
function BoardGameCatalogListFallback() {
  return (
    <section className="mt-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="h-5 w-28 animate-pulse rounded bg-surface-dim" />
        <div className="h-4 w-16 animate-pulse rounded bg-surface-dim" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm"
          >
            <div className="aspect-[4/3] animate-pulse bg-surface-dim" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-2/3 animate-pulse rounded bg-surface-dim" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-dim" />
              <div className="h-10 animate-pulse rounded bg-surface-dim" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
