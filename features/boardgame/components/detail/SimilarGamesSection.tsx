/**
 * File Name : features/boardgame/components/detail/SimilarGamesSection.tsx
 * Description : 보드게임 상세 유사 게임 추천 섹션
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.05  임도헌   Created   taxonomy 공유 기반 유사 게임 추천 UI 분리
 */

import Image from "next/image";
import Link from "next/link";
import type { BoardGameSimilarItem } from "@/features/boardgame/types/public";

/**
 * 상세 페이지 보조 영역에서 현재 게임과 taxonomy가 겹치는 게임 추천
 *
 * @param props - taxonomy 공유 기준으로 계산된 유사 게임 목록
 * @returns 추천할 공개 게임이 있을 때만 표시되는 보조 카드 목록
 */
export default function SimilarGamesSection({
  games,
}: {
  games: BoardGameSimilarItem[];
}) {
  if (!games.length) return null;

  return (
    <section className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-primary">비슷한 게임</h2>
        <p className="mt-1 text-xs leading-5 text-muted">
          카테고리와 메커니즘이 겹치는 공개 게임입니다.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/boardgames/${game.id}`}
            className="focus-ring-soft group grid grid-cols-[64px_minmax(0,1fr)] gap-3 rounded-xl border border-border-subtle bg-surface-dim p-2 transition hover:border-brand/50 hover:bg-surface"
          >
            <div className="aspect-square overflow-hidden rounded-lg bg-surface">
              {game.imageUrl ? (
                <Image
                  src={game.imageUrl}
                  alt={`${game.locale.title} 대표 이미지`}
                  width={96}
                  height={96}
                  sizes="64px"
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] font-bold text-muted">
                  이미지 없음
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-primary group-hover:text-brand dark:group-hover:text-brand-light">
                {game.locale.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-muted">
                {game.locale.shortDescription}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold text-muted">
                {game.minPlayers && game.maxPlayers ? (
                  <span className="rounded-full bg-surface px-2 py-0.5">
                    {game.minPlayers}-{game.maxPlayers}명
                  </span>
                ) : null}
                {game.bayesRating ? (
                  <span className="rounded-full bg-surface px-2 py-0.5">
                    평점 {game.bayesRating.toFixed(1)}
                  </span>
                ) : null}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
