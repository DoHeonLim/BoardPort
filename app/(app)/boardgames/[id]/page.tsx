/**
 * File Name : app/(app)/boardgames/[id]/page.tsx
 * Description : 보드게임 카탈로그 공개 상세 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.28  임도헌   Created   PUBLISHED 보드게임 상세 정보 화면 추가
 * 2026.04.29  임도헌   Modified  BGG 기반 seed 데이터 출처 안내 문구 추가
 * 2026.05.02  임도헌   Modified  분류 한국어 표시명 노출 기준과 helper 주석 정리
 * 2026.05.03  임도헌   Modified  taxonomy 칩 검색 링크와 유사 게임 추천 영역 추가
 * 2026.05.03  임도헌   Modified  상품/게시글/방송 연결 콘텐츠 요약 영역 추가
 * 2026.05.04  임도헌   Modified  상세 탐색 중 제품 메인으로 바로 복귀하는 헤더 액션 추가
 * 2026.05.05  임도헌   Modified  상세 보조 섹션 UI를 detail 컴포넌트로 분리
 * 2026.05.05  임도헌   Modified  상세/추천/연결 콘텐츠 조회 서비스 직접 import 경로 반영
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import BackButton from "@/components/global/BackButton";
import InfoCard from "@/features/boardgame/components/detail/InfoCard";
import RelatedContentSection from "@/features/boardgame/components/detail/RelatedContentSection";
import SimilarGamesSection from "@/features/boardgame/components/detail/SimilarGamesSection";
import TaxonomySection from "@/features/boardgame/components/detail/TaxonomySection";
import { getPublishedBoardGameDetail } from "@/features/boardgame/service/publicQuery/detail";
import { getBoardGameRelatedContent } from "@/features/boardgame/service/publicQuery/relatedContent";
import { getSimilarPublishedBoardGames } from "@/features/boardgame/service/publicQuery/similarGames";
import { getRecommendedPlayersText } from "@/features/boardgame/utils/format";
import {
  ArrowTopRightOnSquareIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface BoardGameDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * 보드게임 상세 페이지의 metadata를 검수된 한국어 title/description으로 구성
 *
 * @param props - URL params의 보드게임 id
 * @returns Next.js page metadata
 */
export async function generateMetadata(
  props: BoardGameDetailPageProps
): Promise<Metadata> {
  const params = await props.params;
  const id = Number(params.id);
  if (!Number.isFinite(id)) {
    return { title: "보드게임 정보" };
  }

  const result = await getPublishedBoardGameDetail(id);
  if (!result.success) {
    return { title: "보드게임 정보" };
  }

  return {
    title: result.data.locale.title,
    description:
      result.data.locale.shortDescription ??
      `${result.data.primaryName} 보드게임 정보`,
  };
}

/**
 * 보드게임 카탈로그 상세 페이지
 *
 * - BoardPort에서 검수한 한국어 설명과 Kaggle CSV 기반 BGG 메타데이터를 함께 표시
 * - category/mechanic은 검수된 koName을 우선 표시하고, 없을 때만 BGG 원문명을 fallback으로 사용
 * - BGG 장문 description은 저장/번역/노출하지 않고 원문 링크로만 연결
 */
export default async function BoardGameDetailPage(
  props: BoardGameDetailPageProps
) {
  const params = await props.params;
  const id = Number(params.id);
  if (!Number.isFinite(id)) notFound();

  const result = await getPublishedBoardGameDetail(id);
  if (!result.success) notFound();

  const boardGame = result.data;
  const [similarResult, relatedContentResult] = await Promise.all([
    getSimilarPublishedBoardGames({
      currentId: boardGame.id,
      categoryIds: boardGame.categories.map((item) => item.id),
      mechanicIds: boardGame.mechanics.map((item) => item.id),
      limit: 4,
    }),
    getBoardGameRelatedContent(boardGame.id),
  ]);
  const similarGames = similarResult.success ? similarResult.data : [];
  const relatedContent = relatedContentResult.success
    ? relatedContentResult.data
    : null;
  const playerText =
    boardGame.minPlayers && boardGame.maxPlayers
      ? `${boardGame.minPlayers}-${boardGame.maxPlayers}명`
      : "정보 없음";
  const playTimeText =
    boardGame.minPlayTime && boardGame.maxPlayTime
      ? boardGame.minPlayTime === boardGame.maxPlayTime
        ? `${boardGame.minPlayTime}분`
        : `${boardGame.minPlayTime}-${boardGame.maxPlayTime}분`
      : boardGame.playingTime
        ? `${boardGame.playingTime}분`
        : "정보 없음";

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col px-4 pb-24 pt-4 sm:px-6 sm:pb-10">
      <header className="flex items-start justify-between gap-3 border-b border-border-subtle pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <BackButton fallbackHref="/boardgames" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-brand">
              보드게임 도감
            </p>
            <h1 className="mt-1 truncate text-xl font-bold text-primary sm:text-2xl">
              {boardGame.locale.title}
            </h1>
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
      </header>

      <section className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm">
            <div className="aspect-[4/3] bg-surface-dim">
              {boardGame.imageUrl ? (
                <Image
                  src={boardGame.imageUrl}
                  alt={`${boardGame.locale.title} 대표 이미지`}
                  width={720}
                  height={540}
                  sizes="(min-width: 1024px) 360px, 100vw"
                  className="h-full w-full object-contain p-4"
                  priority
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-medium text-muted">
                  이미지 없음
                </div>
              )}
            </div>
          </div>

          <a
            href={boardGame.bggUrl}
            target="_blank"
            rel="noreferrer"
            className="focus-ring-soft inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-bold text-primary transition hover:bg-surface-dim"
          >
            BGG 원문 보기
            <ArrowTopRightOnSquareIcon className="size-4" />
          </a>

          <p className="rounded-2xl border border-border-subtle bg-surface p-4 text-xs leading-5 text-muted">
            일부 원천 메타데이터는 BoardGameGeek 기반 공개 데이터셋을 seed로
            사용했습니다. 게임별 원문 정보는 BGG 링크에서 확인할 수 있습니다.
          </p>

          <SimilarGamesSection games={similarGames} />
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-border-subtle bg-surface p-5 shadow-sm">
            <p className="text-sm font-bold text-muted">
              {boardGame.primaryName}
            </p>
            <h2 className="mt-2 text-2xl font-bold text-primary">
              {boardGame.locale.title}
            </h2>
            {boardGame.locale.aliases.length ? (
              <p className="mt-2 text-sm text-muted">
                {boardGame.locale.aliases.join(" · ")}
              </p>
            ) : null}
            <p className="mt-4 text-sm leading-6 text-primary">
              {boardGame.locale.shortDescription}
            </p>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <InfoCard
              label="발매연도"
              value={boardGame.yearPublished ?? "정보 없음"}
            />
            <InfoCard label="플레이 인원" value={playerText} />
            <InfoCard label="플레이 시간" value={playTimeText} />
            <InfoCard
              label="추천 인원"
              value={getRecommendedPlayersText(
                boardGame.bestPlayers,
                boardGame.goodPlayers
              )}
            />
            <InfoCard
              label="권장 연령"
              value={
                boardGame.minAge ? `${boardGame.minAge}세 이상` : "정보 없음"
              }
            />
            <InfoCard
              label="난이도"
              value={
                boardGame.weightAverage
                  ? `${boardGame.weightAverage.toFixed(2)} / 5`
                  : "정보 없음"
              }
            />
            <InfoCard
              label="BGG 평점"
              value={
                boardGame.bggRating
                  ? `${boardGame.bggRating.toFixed(2)}`
                  : "정보 없음"
              }
            />
            <InfoCard
              label="보정 평점"
              value={
                boardGame.bayesRating
                  ? `${boardGame.bayesRating.toFixed(2)}`
                  : "정보 없음"
              }
            />
            <InfoCard
              label="평가 수"
              value={
                boardGame.userRatings
                  ? `${boardGame.userRatings.toLocaleString()}개`
                  : "정보 없음"
              }
            />
            <InfoCard label="시리즈" value={boardGame.family ?? "정보 없음"} />
            <InfoCard
              label="크라우드펀딩"
              value={
                boardGame.kickstarted === null
                  ? "정보 없음"
                  : boardGame.kickstarted
                    ? "Kickstarter"
                    : "해당 없음"
              }
            />
          </section>

          <TaxonomySection title="카테고리" items={boardGame.categories} />
          <TaxonomySection title="메커니즘" items={boardGame.mechanics} />

          <RelatedContentSection
            content={relatedContent}
            searchKeyword={boardGame.locale.title}
          />
        </div>
      </section>
    </main>
  );
}
