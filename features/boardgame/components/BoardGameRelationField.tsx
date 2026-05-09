/**
 * File Name : features/boardgame/components/BoardGameRelationField.tsx
 * Description : 상품/게시글/방송 폼의 보드게임 연결 선택 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.03  임도헌   Created   보드게임 카탈로그 연결 선택 컴포넌트 추가
 * 2026.05.03  임도헌   Modified  검색 결과에 썸네일과 인원/시간 메타데이터 노출
 * 2026.05.03  임도헌   Modified  보드게임 연결 표시 helper 주석 보강
 */

import Image from "next/image";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";

interface BoardGameRelationFieldProps {
  label?: string;
  description?: string;
  options: BoardGameRelationOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  max?: number;
  errors?: string[];
}

const DEFAULT_MAX_BOARDGAME_LINKS = 5;

/**
 * 공개 보드게임 카탈로그 항목을 검색해 현재 작성 중인 콘텐츠와 연결할 수 있는 선택 필드
 *
 * @param props - 선택 옵션, 선택 id 목록, 변경 핸들러와 표시 문구
 * @returns 보드게임 연결 선택 필드
 */
export default function BoardGameRelationField({
  label = "연결할 보드게임",
  description = "상품, 게시글, 방송이 어떤 보드게임과 관련 있는지 연결할 수 있습니다.",
  options,
  selectedIds,
  onChange,
  disabled = false,
  max = DEFAULT_MAX_BOARDGAME_LINKS,
  errors = [],
}: BoardGameRelationFieldProps) {
  const [query, setQuery] = useState("");
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const normalizedQuery = query.trim().toLowerCase();

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedIdSet.has(option.id)),
    [options, selectedIdSet]
  );

  const filteredOptions = useMemo(() => {
    if (!normalizedQuery) return [];

    return options
      .filter((option) => !selectedIdSet.has(option.id))
      .filter((option) => {
        const haystack = [
          option.primaryName,
          option.locale.title,
          ...option.locale.aliases,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
      .slice(0, 8);
  }, [normalizedQuery, options, selectedIdSet]);

  const canAddMore = selectedIds.length < max;

  /**
   * 검색 결과에서 선택한 보드게임을 현재 콘텐츠 연결 목록에 추가
   *
   * @param id - 추가할 BoardGame id
   */
  const addBoardGame = (id: number) => {
    if (disabled || !canAddMore || selectedIdSet.has(id)) return;
    onChange([...selectedIds, id]);
    setQuery("");
  };

  /**
   * 이미 선택된 보드게임을 현재 콘텐츠 연결 목록에서 제거
   *
   * @param id - 제거할 BoardGame id
   */
  const removeBoardGame = (id: number) => {
    if (disabled) return;
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-surface-dim/30 p-4">
      <div className="flex flex-col gap-1">
        <label
          className="text-sm font-medium text-primary"
          htmlFor="boardGameSearch"
        >
          {label}
        </label>
        <p className="text-xs leading-relaxed text-muted">{description}</p>
      </div>

      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-brand/30 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand-dark dark:border-brand-light/30 dark:bg-brand-light/10 dark:text-brand-light"
            >
              <span className="truncate">
                {option.locale.title || option.primaryName}
              </span>
              <button
                type="button"
                onClick={() => removeBoardGame(option.id)}
                disabled={disabled}
                className="rounded-full px-1 text-[11px] text-current/70 transition-colors hover:text-current focus:outline-none focus:ring-2 focus:ring-brand"
                aria-label={`${option.locale.title || option.primaryName} 연결 해제`}
              >
                제거
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          id="boardGameSearch"
          type="search"
          value={query}
          disabled={disabled || !canAddMore}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            canAddMore
              ? "보드게임 제목이나 별칭 검색"
              : `최대 ${max}개까지 연결할 수 있습니다`
          }
          className={cn(
            "h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-primary outline-none transition-colors placeholder:text-muted",
            "focus:border-brand focus:ring-2 focus:ring-brand/20",
            "disabled:cursor-not-allowed disabled:opacity-60"
          )}
        />

        {filteredOptions.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                className="grid w-full grid-cols-[48px_minmax(0,1fr)] gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-dim focus:bg-surface-dim focus:outline-none"
                onClick={() => addBoardGame(option.id)}
              >
                <span className="relative block aspect-square overflow-hidden rounded-lg bg-surface-dim">
                  {option.imageUrl ? (
                    <Image
                      src={option.imageUrl}
                      alt={`${option.locale.title || option.primaryName} 대표 이미지`}
                      width={64}
                      height={64}
                      sizes="48px"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-[10px] font-bold text-muted">
                      이미지 없음
                    </span>
                  )}
                </span>

                <span className="flex min-w-0 flex-col justify-center gap-1">
                  <span className="truncate text-sm font-medium text-primary">
                    {option.locale.title || option.primaryName}
                  </span>
                  <span className="truncate text-xs text-muted">
                    {option.primaryName}
                  </span>
                  <span className="flex flex-wrap gap-1.5 text-[11px] font-medium text-muted">
                    {getPlayerText(option) && (
                      <span className="rounded-full bg-surface px-2 py-0.5">
                        {getPlayerText(option)}
                      </span>
                    )}
                    {getPlayTimeText(option) && (
                      <span className="rounded-full bg-surface px-2 py-0.5">
                        {getPlayTimeText(option)}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {errors.filter(Boolean).length > 0 && (
        <p className="text-xs font-medium text-danger">
          {errors.filter(Boolean)[0]}
        </p>
      )}
    </section>
  );
}

/**
 * 연결 후보의 인원 범위를 compact label로 변환
 *
 * @param option - 공개 보드게임 연결 후보
 * @returns `2-4명` 형식의 인원 label
 */
function getPlayerText(option: BoardGameRelationOption): string {
  if (!option.minPlayers || !option.maxPlayers) return "";
  return `${option.minPlayers}-${option.maxPlayers}명`;
}

/**
 * 연결 후보의 플레이 시간을 compact label로 변환
 *
 * @param option - 공개 보드게임 연결 후보
 * @returns `30-60분` 또는 `60분` 형식의 시간 label
 */
function getPlayTimeText(option: BoardGameRelationOption): string {
  if (option.minPlayTime && option.maxPlayTime) {
    return option.minPlayTime === option.maxPlayTime
      ? `${option.minPlayTime}분`
      : `${option.minPlayTime}-${option.maxPlayTime}분`;
  }

  return option.playingTime ? `${option.playingTime}분` : "";
}
