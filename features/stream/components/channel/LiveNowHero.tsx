/**
 * File Name : features/stream/components/channel/LiveNowHero.tsx
 * Description : 실시간 방송 히어로 섹션 (FOLLOWERS/PRIVATE 가드 + Cloudflare live iframe)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.08.09  임도헌   Created   히어로 섹션 분리
 * 2025.09.13  임도헌   Modified  태그 배지 렌더링 개선, Cloudflare 라이브 iframe, VISITOR 티저 UI(좌상단 LIVE→팔로워, 중앙 CTA), 다크모드
 * 2025.09.13  임도헌   Modified  StreamCategoryTags 컴포넌트로 태그/카테고리 출력 통일, 오버레이 z-index 고정(클릭 가능)
 * 2025.09.13  임도헌   Modified  iframe 자동재생 추가
 * 2025.09.30  임도헌   Modified  우상단 버튼 제거, 전체 클릭 시 상세페이지 이동
 * 2026.01.06  임도헌   Modified  PRIVATE 잠금 판단 SSOT를 stream.requiresPassword(서버/세션 언락 반영)로 전환하여
 *                                언락 후 back/forward 복원에서도 히어로 잠금 표시 정합성 보장
 * 2026.01.14  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import StreamCategoryTags from "@/features/stream/components/StreamDetail/StreamCategoryTags";
import type { BroadcastSummary, ViewerRole } from "@/features/stream/types";

interface Props {
  stream?: BroadcastSummary;
  role: ViewerRole;
  onFollow?: () => void;
}

/**
 * 채널 최상단에 현재 진행 중인 라이브 방송을 크게 보여주는 컴포넌트
 *
 * [기능]
 * 1. 방송이 없을 경우 Empty State 표시
 * 2. 방송이 있을 경우 Cloudflare Player(iframe) 렌더링
 * 3. 접근 권한(Private, Followers Only)에 따라 잠금 화면(Teaser/Overlay) 표시
 * 4. 팔로워 전용 방송일 경우 팔로우 버튼으로 유도하는 CTA 제공
 */
export default function LiveNowHero({ stream, role, onFollow }: Props) {
  return (
    <section className="mx-auto max-w-3xl px-4 w-full">
      <h2 className="text-lg font-bold mb-3 text-primary flex items-center gap-2">
        <span className="text-red-500 animate-pulse">●</span> 실시간 방송
      </h2>

      {!stream ? (
        // [수정] bg-neutral-100 -> bg-surface-dim, border 추가
        <div className="flex flex-col items-center gap-2 py-12 rounded-2xl bg-surface-dim/50 border border-border text-muted">
          <span className="text-2xl grayscale opacity-50">📡</span>
          <p className="text-sm font-medium">현재 진행 중인 방송이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden border border-border bg-surface shadow-sm transition-shadow hover:shadow-md">
          <HeroMedia stream={stream} role={role} onFollow={onFollow} />
          <HeroMeta stream={stream} />
        </div>
      )}
    </section>
  );
}

/* -------------------- Media 영역 -------------------- */

function HeroMedia({
  stream,
  role,
  onFollow,
}: {
  stream: BroadcastSummary;
  role: ViewerRole;
  onFollow?: () => void;
}) {
  /**
   * 시청 가능 여부 판단 (LiveNowHero의 핵심 규칙)
   *
   * 1) FOLLOWERS(팔로워 전용)
   * - VISITOR면 "티저(팔로우 CTA)"를 노출
   * - 팔로우 토글로 즉시 role이 FOLLOWER로 바뀌면, 같은 화면에서 즉시 시청 가능 상태로 전환
   *
   * 2) PRIVATE(비공개/비밀번호)
   * - 팔로우로 풀리지 않는다. (비밀번호 언락 → 세션 저장이 SSOT)
   * - 따라서 PRIVATE 잠금은 클라이언트에서 role만으로 추정하면 안됨
   * - 서버(RSC)가 "세션 언락"까지 반영해 내려준 stream.requiresPassword를 SSOT로 사용
   *   (언락 후 뒤로가기/복원에서도 잠금 표시가 즉시 해제되도록)
   *
   * ※ 호환/방어:
   * - stream.requiresPassword가 없는 구버전 데이터/타입이 섞여 있어도 동작하도록 fallback 로직을 둠
   */
  const isFollowersTeaser =
    stream.visibility === "FOLLOWERS" && role === "VISITOR";

  const isPrivateLocked =
    // SSOT: 서버가 계산해 준 requiresPassword(언락 반영)
    typeof stream.requiresPassword === "boolean"
      ? stream.requiresPassword
      : // fallback: 구버전 호환(언락 반영이 없는 경우)
        stream.visibility === "PRIVATE" && role !== "OWNER";

  const isPlayable = !isPrivateLocked && !isFollowersTeaser;

  return (
    <div className="relative aspect-video bg-black">
      {isPlayable ? (
        <>
          <Link
            href={`/streams/${stream.id}`}
            className="absolute inset-0 z-10"
            aria-label="상세보기"
          >
            <span className="sr-only">상세보기</span>
          </Link>
          <div className="absolute inset-0 z-0">
            <PlayableLive
              liveInputUid={stream.stream_id}
              thumbnail={stream.thumbnail ?? undefined}
            />
          </div>
          <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-2">
            <Badge red>LIVE</Badge>
            {stream.visibility === "FOLLOWERS" && (
              <Badge yellow>팔로워 전용</Badge>
            )}
          </div>
        </>
      ) : isFollowersTeaser ? (
        <FollowersTeaser
          title={stream.title}
          onFollow={onFollow}
          thumbnail={stream.thumbnail ?? undefined}
        />
      ) : (
        <LockedOverlay
          label="비공개"
          title={stream.title}
          tone="orange"
          thumbnail={stream.thumbnail ?? undefined}
        />
      )}
    </div>
  );
}

/* -------------------- Meta/태그 영역 -------------------- */

function getCategoryIcon(
  category: BroadcastSummary["category"]
): string | null {
  if (!category) return null;
  return category.icon ?? null;
}

function HeroMeta({ stream }: { stream: BroadcastSummary }) {
  return (
    <div className="p-4 bg-surface">
      <div className="text-lg font-bold line-clamp-2 text-primary leading-tight">
        {stream.title}
      </div>

      <div className="mt-3">
        <StreamCategoryTags
          category={
            stream.category
              ? {
                  kor_name: stream.category.kor_name,
                  icon: getCategoryIcon(stream.category),
                }
              : undefined
          }
          tags={stream.tags}
        />
      </div>
    </div>
  );
}

/* -------------------- Sub components -------------------- */

function PlayableLive({
  liveInputUid,
  thumbnail,
}: {
  liveInputUid?: string | null;
  thumbnail?: string;
}) {
  const [mount, setMount] = useState(false);
  const DOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN;
  // 뷰포트 진입 시 마운트 (IntersectionObserver)
  const holderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!holderRef.current) return;
    if (typeof IntersectionObserver === "undefined") {
      setMount(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setMount(true);
          obs.disconnect();
        }
      },
      { rootMargin: "600px 0px 0px 0px", threshold: 0.01 }
    );
    obs.observe(holderRef.current);
    return () => obs.disconnect();
  }, []);

  const canEmbed = !!DOMAIN && !!liveInputUid;
  if (!canEmbed) return <FallbackBG thumbnail={thumbnail} />;

  // 자동재생(음소거) 파라미터 부여
  const params = new URLSearchParams({
    autoplay: "1",
    muted: "1",
    preload: "auto",
  });
  const src = `${DOMAIN}/${liveInputUid}/iframe?${params.toString()}`;

  return (
    <div ref={holderRef} className="absolute inset-0">
      {mount ? (
        <iframe
          src={src}
          title="Cloudflare Live Player"
          loading="lazy"
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media; picture-in-picture; accelerometer; gyroscope"
          allowFullScreen
        />
      ) : (
        <FallbackBG thumbnail={thumbnail} />
      )}
    </div>
  );
}

/** VISITOR 티저: 좌상단 뱃지 순서(LIVE → 팔로워 전용), 중앙 CTA, z-index 고정 */
function FollowersTeaser({
  title,
  onFollow,
  thumbnail,
}: {
  title: string;
  onFollow?: () => void;
  thumbnail?: string;
}) {
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 z-0">
        <FallbackBG thumbnail={thumbnail} />
      </div>
      <div
        className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <Badge red>LIVE</Badge>
        <Badge yellow>팔로워 전용</Badge>
      </div>
      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <h3 className="text-white text-lg font-bold leading-snug line-clamp-2 drop-shadow-md">
          {title}
        </h3>
        <button
          type="button"
          onClick={onFollow}
          className="px-5 py-2.5 rounded-full bg-brand text-white text-sm font-semibold shadow hover:bg-brand-light transition"
        >
          팔로우하고 시청하기
        </button>
      </div>
    </div>
  );
}

/** PRIVATE 잠금 오버레이: z-index 고정(클릭 통과) */
function LockedOverlay({
  label,
  title,
  tone = "orange",
  thumbnail,
}: {
  label: string;
  title: string;
  tone?: "orange" | "rose";
  thumbnail?: string;
}) {
  const toneClass =
    tone === "orange" ? "bg-orange-600 text-white" : "bg-rose-600 text-white";
  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 z-0">
        <FallbackBG thumbnail={thumbnail} />
      </div>
      <div
        className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] pointer-events-none"
        aria-hidden="true"
      />
      <div className="absolute inset-0 z-30 flex flex-col justify-end gap-3 p-4">
        <span
          className={`px-2 py-0.5 rounded text-xs font-bold w-max ${toneClass}`}
        >
          {label}
        </span>
        <h3 className="text-white text-lg font-bold line-clamp-2">{title}</h3>
      </div>
    </div>
  );
}

function FallbackBG({ thumbnail }: { thumbnail?: string }) {
  if (thumbnail) {
    return (
      <div
        className="absolute inset-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${thumbnail})` }}
        aria-hidden="true"
      />
    );
  }
  return <div className="absolute inset-0 bg-neutral-900" aria-hidden="true" />;
}

function Badge({
  children,
  red,
  yellow,
  orange,
}: {
  children: React.ReactNode;
  red?: boolean;
  yellow?: boolean;
  orange?: boolean;
}) {
  const base =
    "px-2 py-0.5 rounded text-xs font-bold shadow-sm backdrop-blur-[2px]";
  const tone = red
    ? "bg-red-600/90 text-white"
    : yellow
      ? "bg-yellow-400/90 text-black"
      : orange
        ? "bg-orange-500/90 text-white"
        : "bg-neutral-800/80 text-white";
  return <span className={`${base} ${tone}`}>{children}</span>;
}
