/**
 * File Name : features/boardgame/components/catalog/BoardGameCatalogCard.tsx
 * Description : 보드게임 공개 카탈로그 목록 카드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   목록 페이지에서 공개 보드게임 카드 UI 분리
 */

import Image from "next/image";
import Link from "next/link";
import TaxonomyPreviewChips from "@/features/boardgame/components/catalog/TaxonomyPreviewChips";
import type { BoardGamePublicListItem } from "@/features/boardgame/types/public";

interface BoardGameCatalogCardProps {
  item: BoardGamePublicListItem;
}

/**
 * 공개 카탈로그 목록에서 검수된 보드게임 요약 정보를 카드로 표시하는 컴포넌트
 *
 * @param props - 공개 보드게임 목록 항목
 * @returns 보드게임 카탈로그 카드 링크
 */
export default function BoardGameCatalogCard({
  item,
}: BoardGameCatalogCardProps) {
  return (
    <Link
      href={`/boardgames/${item.id}`}
      className="focus-ring-soft group overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-md"
    >
      <div className="aspect-[4/3] bg-surface-dim">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={`${item.locale.title} 대표 이미지`}
            width={420}
            height={315}
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-muted">
            이미지 없음
          </div>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-base font-bold text-primary">
            {item.locale.title}
          </h3>
          <p className="mt-1 truncate text-sm font-medium text-muted">
            {item.primaryName}
          </p>
        </div>

        <p className="line-clamp-2 min-h-10 text-sm leading-5 text-muted">
          {item.locale.shortDescription}
        </p>

        <TaxonomyPreviewChips
          categories={item.categories}
          mechanics={item.mechanics}
        />

        <div className="flex flex-wrap gap-2 text-xs font-bold text-muted">
          {item.minPlayers && item.maxPlayers ? (
            <span className="rounded-full bg-surface-dim px-2.5 py-1">
              {item.minPlayers}-{item.maxPlayers}명
            </span>
          ) : null}
          {item.playingTime ? (
            <span className="rounded-full bg-surface-dim px-2.5 py-1">
              {item.playingTime}분
            </span>
          ) : null}
          {item.weightAverage ? (
            <span className="rounded-full bg-surface-dim px-2.5 py-1">
              난이도 {item.weightAverage.toFixed(1)}
            </span>
          ) : null}
          {item.bayesRating ? (
            <span className="rounded-full bg-surface-dim px-2.5 py-1">
              평점 {item.bayesRating.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
