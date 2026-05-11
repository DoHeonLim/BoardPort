/**
 * File Name : features/boardgame/components/LinkedBoardGameChips.tsx
 * Description : 콘텐츠 상세에서 연결된 보드게임 카탈로그 칩 표시
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.03  임도헌   Created   상품/게시글/방송 상세의 연결 보드게임 표시 컴포넌트 추가
 * 2026.05.04  임도헌   Modified  게시글 상세에서 사용할 수 있는 카드형 표시 variant 추가
 */

import Link from "next/link";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

interface LinkedBoardGameChipsProps {
  items?: BoardGameRelationOption[];
  title?: string;
  compact?: boolean;
  variant?: "chips" | "cards";
}

/**
 * 연결된 보드게임을 카탈로그 상세로 이동 가능한 칩/카드 목록으로 표시
 *
 * @param props - 보드게임 옵션 배열과 표시 옵션
 * @returns 연결 보드게임 칩 영역
 */
export default function LinkedBoardGameChips({
  items = [],
  title = "연결된 보드게임",
  compact = false,
  variant = "chips",
}: LinkedBoardGameChipsProps) {
  if (!items.length) return null;

  if (variant === "cards") {
    return (
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-primary">{title}</h3>
        <div className="grid gap-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/boardgames/${item.id}`}
              className="focus-ring-soft group flex items-center justify-between gap-3 rounded-2xl border border-border-subtle bg-surface p-3 text-left transition-colors hover:border-brand/40 hover:bg-surface-dim"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-brand dark:text-brand-light">
                  보드게임 도감
                </p>
                <p className="mt-1 truncate text-sm font-bold text-primary">
                  {item.locale.title || item.primaryName}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted">
                  {item.primaryName}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-primary transition-colors group-hover:border-brand/45 group-hover:text-brand">
                도감 보기
                <ArrowTopRightOnSquareIcon className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className={compact ? "flex flex-wrap gap-2" : "flex flex-col gap-2"}
    >
      {!compact && (
        <h3 className="text-sm font-medium text-primary">{title}</h3>
      )}
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/boardgames/${item.id}`}
            className="focus-ring-soft inline-flex max-w-full items-center rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-xs font-medium text-brand-dark transition-colors hover:border-brand/50 hover:bg-brand/15 dark:border-brand-light/25 dark:bg-brand-light/10 dark:text-brand-light dark:hover:border-brand-light/50"
          >
            <span className="truncate">
              {item.locale.title || item.primaryName}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
