/**
 * File Name : features/boardgame/components/catalog/BoardGameCatalogFilters.tsx
 * Description : 보드게임 도감 반응형 검색 및 필터 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.11  임도헌   Created   모바일 바텀시트와 데스크톱 인라인 필터 분리
 */

"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import BottomSheet from "@/components/global/BottomSheet";
import FilterSelect from "@/features/boardgame/components/catalog/FilterSelect";
import type {
  BoardGameCatalogFilters,
  BoardGamePlayerFilter,
  BoardGameSortOption,
  BoardGameTimeFilter,
  BoardGameWeightFilter,
} from "@/features/boardgame/types/catalog";
import { buildBoardGameListHref } from "@/features/boardgame/utils/catalogFilters";

interface BoardGameCatalogFiltersProps {
  filters: BoardGameCatalogFilters;
  hasActiveFilters: boolean;
}

const PLAYER_OPTIONS = [
  { value: "", label: "전체 인원" },
  { value: "solo", label: "1인 가능" },
  { value: "two", label: "2인 추천" },
  { value: "threeFour", label: "3-4인" },
  { value: "group", label: "5인 이상" },
];

const PLAY_TIME_OPTIONS = [
  { value: "", label: "전체 시간" },
  { value: "short", label: "30분 이하" },
  { value: "standard", label: "31-90분" },
  { value: "long", label: "90분 이상" },
];

const WEIGHT_OPTIONS = [
  { value: "", label: "전체 난이도" },
  { value: "light", label: "가벼움" },
  { value: "medium", label: "보통" },
  { value: "heavy", label: "전략" },
];

const SORT_OPTIONS = [
  { value: "rank", label: "도감 기본순" },
  { value: "rating", label: "평점순" },
  { value: "popular", label: "평가 많은 순" },
  { value: "newest", label: "신작순" },
];

/** 보드게임 필터 값에 대응하는 표시 문구 조회 */
function getOptionLabel(
  options: Array<{ value: string; label: string }>,
  value: string | undefined
) {
  return options.find((option) => option.value === value)?.label;
}

/** 모바일과 데스크톱 환경에 맞는 도감 검색 및 필터 UI */
export default function BoardGameCatalogFilters({
  filters,
  hasActiveFilters,
}: BoardGameCatalogFiltersProps) {
  const router = useRouter();
  const [query, setQuery] = useState(filters.query ?? "");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [draftFilters, setDraftFilters] =
    useState<BoardGameCatalogFilters>(filters);

  const appliedFilterLabels = [
    getOptionLabel(PLAYER_OPTIONS, filters.players),
    getOptionLabel(PLAY_TIME_OPTIONS, filters.playTime),
    getOptionLabel(WEIGHT_OPTIONS, filters.weight),
    filters.sort && filters.sort !== "rank"
      ? getOptionLabel(SORT_OPTIONS, filters.sort)
      : undefined,
  ].filter((label): label is string => Boolean(label));

  const closeFilterSheet = () => {
    setDraftFilters(filters);
    setIsFilterSheetOpen(false);
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(
      buildBoardGameListHref(1, {
        ...filters,
        query: query.trim() || undefined,
      })
    );
  };

  const applyDraftFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsFilterSheetOpen(false);
    router.push(
      buildBoardGameListHref(1, {
        ...draftFilters,
        query: query.trim() || undefined,
      })
    );
  };

  const resetDraftFilters = () => {
    setDraftFilters({ query: filters.query, sort: "rank" });
  };

  return (
    <div className="mt-5 space-y-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <input
            name="q"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="게임명, 별칭 검색"
            className="input-primary h-12 w-full pl-10"
          />
          <MagnifyingGlassIcon
            className="absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
        </div>
        <button type="submit" className="btn-primary h-12 px-5 font-bold">
          검색
        </button>
      </form>

      <form
        onSubmit={applyDraftFilters}
        className="hidden gap-2 sm:grid sm:grid-cols-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
      >
        <FilterFields filters={draftFilters} onChange={setDraftFilters} />
        <button
          type="submit"
          className="btn-secondary h-11 self-end px-4 font-bold sm:col-span-2 lg:col-span-1"
        >
          필터 적용
        </button>
      </form>

      <div className="flex items-center gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setIsFilterSheetOpen(true)}
          className="focus-ring-soft inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm font-bold text-primary shadow-sm transition-colors hover:bg-surface-dim"
        >
          <AdjustmentsHorizontalIcon className="size-5" aria-hidden="true" />
          필터
          {appliedFilterLabels.length > 0 ? (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-brand text-[11px] text-white">
              {appliedFilterLabels.length}
            </span>
          ) : null}
        </button>

        {hasActiveFilters ? (
          <Link
            href="/boardgames"
            className="focus-ring-soft ml-auto inline-flex h-10 items-center rounded-xl px-3 text-xs font-bold text-muted transition-colors hover:bg-surface-dim hover:text-primary"
          >
            전체 초기화
          </Link>
        ) : null}
      </div>

      {appliedFilterLabels.length > 0 ? (
        <div
          className="flex flex-wrap gap-1.5 sm:hidden"
          aria-label="적용된 필터"
        >
          {appliedFilterLabels.map((label) => (
            <span
              key={label}
              className="rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand-dark dark:border-brand-light/35 dark:bg-brand-light/10 dark:text-brand-light"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {hasActiveFilters ? (
        <div className="hidden items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-dim px-3 py-2 sm:flex">
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

      <BottomSheet
        open={isFilterSheetOpen}
        title="도감 필터"
        description="플레이 조건과 정렬 기준을 선택하세요."
        onClose={closeFilterSheet}
        contentClassName="pt-4"
        footer={
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={resetDraftFilters}
              className="btn-secondary min-h-[44px] text-sm font-bold"
            >
              조건 지우기
            </button>
            <button
              type="submit"
              form="boardgame-mobile-filter-form"
              className="btn-primary min-h-[44px] text-sm font-bold"
            >
              적용하기
            </button>
          </div>
        }
      >
        <form
          id="boardgame-mobile-filter-form"
          onSubmit={applyDraftFilters}
          className="grid gap-4"
        >
          <FilterFields filters={draftFilters} onChange={setDraftFilters} />
        </form>
      </BottomSheet>
    </div>
  );
}

/** 필터 표시 환경에서 공유하는 인원·시간·난이도·정렬 입력 묶음 */
function FilterFields({
  filters,
  onChange,
}: {
  filters: BoardGameCatalogFilters;
  onChange: (filters: BoardGameCatalogFilters) => void;
}) {
  return (
    <>
      <FilterSelect
        name="players"
        label="인원"
        value={filters.players ?? ""}
        onChange={(value) =>
          onChange({
            ...filters,
            players: (value || undefined) as BoardGamePlayerFilter | undefined,
          })
        }
        options={PLAYER_OPTIONS}
      />
      <FilterSelect
        name="playTime"
        label="시간"
        value={filters.playTime ?? ""}
        onChange={(value) =>
          onChange({
            ...filters,
            playTime: (value || undefined) as BoardGameTimeFilter | undefined,
          })
        }
        options={PLAY_TIME_OPTIONS}
      />
      <FilterSelect
        name="weight"
        label="난이도"
        value={filters.weight ?? ""}
        onChange={(value) =>
          onChange({
            ...filters,
            weight: (value || undefined) as BoardGameWeightFilter | undefined,
          })
        }
        options={WEIGHT_OPTIONS}
      />
      <FilterSelect
        name="sort"
        label="정렬"
        value={filters.sort ?? "rank"}
        onChange={(value) =>
          onChange({ ...filters, sort: value as BoardGameSortOption })
        }
        options={SORT_OPTIONS}
      />
    </>
  );
}
