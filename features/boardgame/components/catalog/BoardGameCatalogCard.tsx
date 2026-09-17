/**
 * File Name : features/boardgame/components/catalog/BoardGameCatalogCard.tsx
 * Description : 보드게임 공개 카탈로그 목록 카드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   목록 페이지에서 공개 보드게임 카드 UI 분리
 * 2026.09.11  임도헌   Modified  모바일 가로형 요약 카드와 데스크톱 상세 카드 분리
 * 2026.09.11  임도헌   Modified  Next.js 16 기준 첫 LCP 이미지 eager 로딩 지원
 * 2026.09.11  임도헌   Modified  모바일 카드에 한 줄 설명과 난이도 정보 보강
 */

import Image from "next/image";
import Link from "next/link";
import TaxonomyPreviewChips from "@/features/boardgame/components/catalog/TaxonomyPreviewChips";
import type { BoardGamePublicListItem } from "@/features/boardgame/types/public";

interface BoardGameCatalogCardProps {
  item: BoardGamePublicListItem;
  isPriority?: boolean;
}

/**
 * 공개 카탈로그 목록에서 검수된 보드게임 요약 정보를 카드로 표시하는 컴포넌트
 *
 * @param props - 공개 보드게임 목록 항목
 * @returns 보드게임 카탈로그 카드 링크
 */
export default function BoardGameCatalogCard({
  item,
  isPriority = false,
}: BoardGameCatalogCardProps) {
  return (
    <Link
      href={`/boardgames/${item.id}`}
      className="focus-ring-soft group flex min-h-36 overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-brand/60 hover:shadow-md sm:block sm:min-h-0"
    >
      <div className="relative w-28 shrink-0 bg-surface-dim sm:aspect-[4/3] sm:w-auto">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={`${item.locale.title} 대표 이미지`}
            fill
            loading={isPriority ? "eager" : "lazy"}
            fetchPriority={isPriority ? "high" : undefined}
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 112px"
            className="object-contain p-2 transition duration-300 group-hover:scale-[1.02] sm:p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm font-medium text-muted">
            이미지 없음
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-3 sm:block sm:space-y-3 sm:p-4">
        <div>
          <h3 className="line-clamp-2 text-sm font-bold leading-5 text-primary sm:text-base sm:leading-normal">
            {item.locale.title}
          </h3>
          <p className="mt-0.5 truncate text-xs font-medium text-muted sm:mt-1 sm:text-sm">
            {item.primaryName}
          </p>
        </div>

        <p className="mt-1 line-clamp-1 text-xs leading-4 text-muted sm:mt-0 sm:line-clamp-2 sm:min-h-10 sm:text-sm sm:leading-5">
          {item.locale.shortDescription}
        </p>

        <div className="hidden sm:block">
          <TaxonomyPreviewChips
            categories={item.categories}
            mechanics={item.mechanics}
          />
        </div>

        <div className="mt-auto flex flex-wrap gap-1.5 pt-2 text-[11px] font-bold text-muted sm:mt-0 sm:gap-2 sm:pt-0 sm:text-xs">
          {item.minPlayers && item.maxPlayers ? (
            <span className="rounded-full bg-surface-dim px-2 py-1 sm:px-2.5">
              {item.minPlayers}-{item.maxPlayers}명
            </span>
          ) : null}
          {item.playingTime ? (
            <span className="rounded-full bg-surface-dim px-2 py-1 sm:px-2.5">
              {item.playingTime}분
            </span>
          ) : null}
          {item.weightAverage ? (
            <span className="rounded-full bg-surface-dim px-2 py-1 sm:px-2.5">
              난이도 {item.weightAverage.toFixed(1)}
            </span>
          ) : null}
          {item.bayesRating ? (
            <span className="rounded-full bg-surface-dim px-2 py-1 sm:px-2.5">
              평점 {item.bayesRating.toFixed(1)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
