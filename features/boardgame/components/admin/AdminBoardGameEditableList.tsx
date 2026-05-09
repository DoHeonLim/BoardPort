/**
 * File Name : features/boardgame/components/admin/AdminBoardGameEditableList.tsx
 * Description : 관리자 보드게임 한국어 locale 편집 목록
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   관리자 보드게임 검수 카드 목록 UI 분리
 */

import Image from "next/image";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { BoardGameLocaleStatus } from "@/generated/prisma/enums";
import type { BoardGameAdminListResponse } from "@/features/boardgame/types/admin";

interface AdminBoardGameEditableListProps {
  items: BoardGameAdminListResponse["items"];
  isSavePending: boolean;
  onSave: (boardGameId: number, formData: FormData) => void;
}

/**
 * 관리자 검수 화면에서 보드게임 한국어 제목/설명/키워드를 항목별로 편집할 수 있는 목록 UI
 *
 * @param props - 관리자 목록 항목과 저장 상태/handler
 * @returns 보드게임 locale 편집 카드 목록
 */
export default function AdminBoardGameEditableList({
  items,
  isSavePending,
  onSave,
}: AdminBoardGameEditableListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-subtle bg-surface p-8 text-center text-sm font-medium text-muted">
        등록된 보드게임이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm"
        >
          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <BoardGameSourceSummary item={item} />

            <form
              onSubmit={(event) => {
                event.preventDefault();
                onSave(item.id, new FormData(event.currentTarget));
              }}
              className="grid gap-3"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
                <label className="grid gap-1.5 text-sm font-bold text-primary">
                  한국어 제목
                  <input
                    name="title"
                    defaultValue={item.locale?.title ?? item.primaryName}
                    className="input-primary min-h-11 px-3.5"
                    required
                  />
                </label>

                <label className="grid gap-1.5 text-sm font-bold text-primary">
                  공개 상태
                  <select
                    name="status"
                    defaultValue={
                      item.locale?.status ?? BoardGameLocaleStatus.DRAFT
                    }
                    className="input-primary min-h-11 px-3.5"
                  >
                    <option value={BoardGameLocaleStatus.DRAFT}>초안</option>
                    <option value={BoardGameLocaleStatus.REVIEWED}>
                      검수 완료
                    </option>
                    <option value={BoardGameLocaleStatus.PUBLISHED}>
                      공개
                    </option>
                    <option value={BoardGameLocaleStatus.ARCHIVED}>보관</option>
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5 text-sm font-bold text-primary">
                별칭
                <input
                  name="aliases"
                  defaultValue={item.locale?.aliases.join(", ") ?? ""}
                  className="input-primary min-h-11 px-3.5"
                  placeholder="쉼표로 구분"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-primary">
                짧은 설명
                <textarea
                  name="shortDescription"
                  defaultValue={item.locale?.shortDescription ?? ""}
                  className="input-primary min-h-28 resize-none px-3.5 py-3"
                  maxLength={240}
                  placeholder="외부 설명 번역이 아닌 자체 작성 소개문"
                />
              </label>

              <label className="grid gap-1.5 text-sm font-bold text-primary">
                검색 키워드
                <input
                  name="searchKeywords"
                  defaultValue={item.locale?.searchKeywords.join(", ") ?? ""}
                  className="input-primary min-h-11 px-3.5"
                  placeholder="쉼표로 구분"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavePending}
                  className="btn-primary min-h-11 px-5 text-sm font-bold disabled:opacity-60"
                >
                  {isSavePending ? "저장 중" : "저장"}
                </button>
              </div>
            </form>
          </div>
        </article>
      ))}
    </div>
  );
}

/**
 * 검수 폼 왼쪽에 원천 BGG 메타데이터 요약을 표시
 *
 * @param props - 관리자 목록의 단일 보드게임 항목
 * @returns 원천 메타데이터 요약 카드
 */
function BoardGameSourceSummary({
  item,
}: {
  item: BoardGameAdminListResponse["items"][number];
}) {
  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden rounded-xl border border-border-subtle bg-surface-dim">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={`${item.primaryName} 대표 이미지`}
            width={220}
            height={165}
            sizes="(min-width: 1024px) 220px, 100vw"
            className="h-full w-full object-contain p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-muted">
            이미지 없음
          </div>
        )}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-surface-dim px-2.5 py-1 text-xs font-bold text-muted">
            BGG #{item.bggId}
          </span>
          <a
            href={`https://boardgamegeek.com/boardgame/${item.bggId}`}
            target="_blank"
            rel="noreferrer"
            className="focus-ring-soft inline-flex rounded-full p-1 text-muted hover:text-brand"
            aria-label={`${item.primaryName} BGG 원문 열기`}
          >
            <ArrowTopRightOnSquareIcon className="size-4" />
          </a>
        </div>
        <h3 className="text-base font-bold text-primary">{item.primaryName}</h3>
        <p className="text-muted">
          {item.yearPublished ? `${item.yearPublished}년` : "연도 미상"}
          {item.bggRank ? ` · BGG Rank ${item.bggRank}` : ""}
          {item.userRatings
            ? ` · 평가 ${item.userRatings.toLocaleString()}개`
            : ""}
        </p>
        {item.family ? (
          <p className="line-clamp-1 text-xs font-medium text-muted">
            Family: {item.family}
          </p>
        ) : null}
      </div>
    </div>
  );
}
