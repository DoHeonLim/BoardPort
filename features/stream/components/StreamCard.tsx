/**
 * File Name : features/stream/components/StreamCard.tsx
 * Description : 스트리밍 카드 섹션 (라이브/녹화 공용)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.05.16  임도헌   Created
 * 2025.05.16  임도헌   Modified  스트리밍 카드 섹션 추가
 * 2025.08.10  임도헌   Modified  썸네일 cover, 모달 접근성, 팔로우 오버레이 옵션
 * 2025.08.10  임도헌   Modified  requiresPassword/followersOnlyLocked 지원, 비번 비교 제거
 * 2025.08.14  임도헌   Modified  썸네일 URL 정규화(Cloudflare Stream/Images) 및 녹화 카드 재사용
 * 2025.08.26  임도헌   Modified  형식 배지 단일화(LIVE/팔로워/비밀), 메타 줄 깨짐 수정, 썸네일 cover
 * 2025.08.27  임도헌   Modified  배지 다중 표기(LIVE/다시보기/팔로워/비밀) 별도 노출, isPrivateType 지원
 * 2025.08.30  임도헌   Modified  PrivateAccessModal 공용 모달로 교체
 * 2025.09.03  임도헌   Modified  기본 href 분기(라이브/녹화) 및 모달 redirect 경로 일치
 * 2025.09.05  임도헌   Modified  (a11y) 잠금 시 키보드 네비 차단(Enter/Space), 오버레이 버튼 aria 보강
 * 2025.09.10  임도헌   Modified  a11y(aria-disabled/배지 sr-only), useMemo로 계산값 메모
 * 2025.09.23  임도헌   Modified  뷰포트에 들어오면 미니 프리뷰 iframe 렌더
 * 2025.11.23  임도헌   Modified  layout(grid/rail) prop 도입, 카드 flex(h-full) 레이아웃 정리,
 *                                내/채널/리스트 공용 카드 폭 제어
 * 2025.11.23  임도헌   Modified  카드 하단 레이아웃을 제목/유저/메타 3단 구조로 재배치
 * 2025.11.26  임도헌   Modified  라이브/녹화용 id를 분리하도록 수정
 * 2025.12.20  임도헌   Modified  rail 레이아웃에서 FOLLOWERS 잠금 시 CTA 노출 + onRequestFollow 콜백 호출(프로필 헤더 팔로우 유도)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 및 디자인 통일 (PostCard/ProductCard)
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.25  임도헌   Modified  녹화본 메타데이터(duration, viewCount) 내부 렌더링 지원 (UI 깨짐 수정)
 * 2026.01.25  임도헌   Modified  카테고리를 썸네일 우측 상단 오버레이로 이동, 하단에 태그(#) 추가
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.05  임도헌   Modified  모달 Dynamic Import 적용
 * 2026.02.26  임도헌   Modified  좁은 화면에서 UI 깨짐 수정
 * 2026.03.06  임도헌   Modified  모바일 카드 정보 영역의 간격과 메타 밀도를 조정해 목록 가독성을 개선
 * 2026.03.06  임도헌   Modified  팔로워 전용 오버레이 CTA 터치 타겟을 44px 기준에 맞게 확장
 */

"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { cn, formatToTimeAgo, formatDuration } from "@/lib/utils";
import UserAvatar from "@/components/global/UserAvatar";
import { PhotoIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { StreamCategory, StreamVisibility } from "@/features/stream/types";
import { STREAM_VISIBILITY } from "@/features/stream/constants";

const PrivateAccessModal = dynamic(
  () => import("@/features/stream/components/PrivateAccessModal"),
  { ssr: false }
);

interface StreamCardProps {
  id: number /** unlock 타깃(원본 streamId 권장) */;
  vodIdForRecording?: number /** 녹화본 페이지로 이동할 때 사용할 VodAsset id (없으면 id로 폴백) */;
  title: string;
  thumbnail?: string | null;
  isLive: boolean /** 라이브 여부 (false면 다시보기 배지 표시) */;
  streamer: { username: string; avatar?: string | null };
  startedAt?:
    | Date
    | string
    | null /** 서버에서 Date로 오기도 하므로 넓혀서 수용 */;
  category?: StreamCategory | null;
  tags?: { name: string }[];
  duration?: number; // 초 단위
  viewCount?: number; // 조회수
  shortDescription?: boolean;
  href?: string /** 직접 지정하면 우선 사용, 없으면 isLive 기준으로 기본 경로 계산 */;
  // 서버 플래그
  requiresPassword?: boolean /** PRIVATE 접근 필요 여부(언락 전). 언락 후 false가 될 수 있음 */;
  isFollowersOnly?: boolean /** FOLLOWERS 타입 여부(형식) — 전달 안 되면 visibility로 판정 */;
  followersOnlyLocked?: boolean /** 비팔로워라 접근 잠금일 때 true (오버레이/CTA 트리거) */;
  visibility?: StreamVisibility /** visibility가 있으면 배지/잠금 보조 판별에 사용 가능 */;
  // 옵션: 언락 이후에도 '비밀' 배지를 계속 보여주고 싶다면 명시적으로 true 전달
  isPrivateType?: boolean /** visibility === "PRIVATE" 타입 표시(언락 후에도 '비밀' 배지를 유지하고 싶을 때 사용) */;
  onRequestFollow?: () => void; // 팔로우 CTA// 옵션 액션
  /** 레이아웃 모드: grid(기본), rail(가로 스크롤용 고정폭 카드) */
  layout?: "grid" | "rail";
}

function resolveThumbUrl(src?: string | null): string | null {
  if (!src) return null;
  if (src.startsWith("https://imagedelivery.net")) return `${src}/public`;
  return src;
}

/**
 * 스트리밍 카드 컴포넌트
 *
 * [기능]
 * 1. 라이브 및 녹화본(VOD) 정보를 카드 형태로 표시
 * 2. 썸네일, 제목, 스트리머 정보, 카테고리, 태그, 메타 정보(시간, 조회수 등)를 렌더링
 * 3. 접근 권한(Private, Followers Only)에 따른 잠금 UI 및 오버레이를 제공
 * 4. 마우스 호버 시 라이브 미리보기(iframe)를 로드
 * 5. 클릭 시 권한에 따라 상세 페이지 이동, 비밀번호 모달 열기, 팔로우 요청 등을 수행
 *
 * [권한]
 * - `PRIVATE` 방송: `requiresPassword` prop을 SSOT로 사용 (서버에서 세션의 언락 여부까지 확인하여 주입됨)
 * - `FOLLOWERS` 방송: 서버에서 받은 `followersOnlyLocked` 플래그를 기본으로 하되,
 *   클라이언트의 팔로우 상태(`isFollowing`) 변화를 실시간으로 반영하여 잠금을 즉시 해제/설정
 */
export default function StreamCard(props: StreamCardProps) {
  const {
    id,
    vodIdForRecording,
    title,
    thumbnail,
    isLive,
    streamer,
    startedAt,
    category,
    tags,
    duration,
    viewCount,
    shortDescription = false,
    href,
    requiresPassword = false,
    isFollowersOnly,
    followersOnlyLocked = false,
    visibility,
    isPrivateType,
    onRequestFollow,
    layout = "grid",
  } = props;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const thumb = useMemo(() => resolveThumbUrl(thumbnail), [thumbnail]);

  // 기본 라우팅: 라이브/녹화에 따라 자동 분기(직접 href 주면 우선)
  const computedHref = useMemo(
    () =>
      href ??
      (isLive
        ? `/streams/${id}` // 라이브는 broadcastId
        : vodIdForRecording
        ? `/streams/${vodIdForRecording}/recording` // 녹화는 vodId
        : `/streams/${id}/recording`), // fallback: 예전 방식
    [href, isLive, id, vodIdForRecording]
  );

  // FOLLOWERS 배지/오버레이 판정 (prop 우선, 없으면 visibility로 계산)
  const derivedFollowersOnly =
    typeof isFollowersOnly === "boolean"
      ? isFollowersOnly
      : visibility === STREAM_VISIBILITY.FOLLOWERS;

  // 실제 접근 잠김 상태(팔로워 잠금 or 비번 필요)
  const lockMask = useMemo(
    () => followersOnlyLocked || requiresPassword,
    [followersOnlyLocked, requiresPassword]
  );

  // startedAt를 ISO 문자열로 정규화 (formatToTimeAgo 호환)
  const startedAtIso = useMemo(() => {
    if (!startedAt) return null;
    if (startedAt instanceof Date) return startedAt.toISOString();
    if (typeof startedAt === "string") return startedAt;
    return null;
  }, [startedAt]);

  // ======== Hover/Focus 기반 Preview 로직 (IntersectionObserver 제거) ========
  const hoverTimerRef = useRef<number | null>(null);
  const [isHoveredOrFocused, setIsHoveredOrFocused] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // 프리뷰를 띄울 자격(락이 없고 실제 라이브일 때만)
  const shouldPreview = isLive && !lockMask;

  // hover debounce: 짧은 스치기 무시
  const startHover = () => {
    if (!shouldPreview) return;
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    hoverTimerRef.current = window.setTimeout(() => {
      setIsHoveredOrFocused(true);
      hoverTimerRef.current = null;
    }, 200);
  };

  const endHover = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHoveredOrFocused(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, []);

  // 렌더 조건: 호버/포커스 중일때(접근성 포함) 프리뷰 허용
  const shouldRenderPreview =
    shouldPreview && isHoveredOrFocused && !previewError;

  const handleStreamClick = (e: React.MouseEvent) => {
    if (followersOnlyLocked) {
      e.preventDefault();
      onRequestFollow?.();
      return;
    }
    if (requiresPassword) {
      e.preventDefault();
      setIsModalOpen(true);
      return;
    }
  };

  // 키보드 접근성: Enter/Space로도 동일 동작
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      if (followersOnlyLocked || requiresPassword) {
        e.preventDefault();
        if (followersOnlyLocked) onRequestFollow?.();
        else setIsModalOpen(true);
      }
    },
    [followersOnlyLocked, requiresPassword, onRequestFollow]
  );

  // 배지: 타입별 개별 노출
  const showLive = isLive;
  const showReplay = !isLive;
  const showFollowers = derivedFollowersOnly;
  // 기본은 requiresPassword 기준, 필요 시 isPrivateType으로 강제 표시
  const showPrivate =
    typeof isPrivateType === "boolean" ? isPrivateType : requiresPassword;

  const ariaLabel = lockMask
    ? `${title} — 접근 제한(팔로워 전용 또는 비밀)`
    : title;

  // 태그 포맷팅 (#태그1 #태그2)
  const formattedTags = useMemo(() => {
    if (!tags || tags.length === 0) return null;
    // 너무 길어지면 UI 깨지므로 2개까지만 노출하거나, css line-clamp로 처리
    return tags.map((t) => `#${t.name}`).join(" ");
  }, [tags]);
  const isGridLayout = layout === "grid";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-brand/30 dark:hover:border-brand-light/30",
        layout === "rail"
          ? "w-[240px] sm:w-[260px] flex-none h-full snap-start"
          : "w-full"
      )}
    >
      <Link
        href={computedHref}
        className="group flex flex-col flex-1 h-full"
        onClick={handleStreamClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-disabled={lockMask || undefined}
        prefetch={false}
      >
        {/* 썸네일 영역 */}
        <div
          className="relative aspect-video w-full bg-surface-dim border-b border-border"
          data-preview={shouldRenderPreview ? "true" : "false"}
          onMouseEnter={startHover}
          onMouseLeave={endHover}
          onFocus={startHover}
          onBlur={endHover}
        >
          {shouldRenderPreview ? (
            <div className="pointer-events-none absolute inset-0 bg-black">
              <iframe
                src={`/streams/${id}/live-preview`}
                className="h-full w-full"
                title="Live Mini Preview"
                loading="lazy"
                tabIndex={-1}
                aria-hidden="true"
                allow="autoplay; encrypted-media; picture-in-picture"
                onError={() => {
                  console.warn("[StreamCard] live-preview iframe failed:", id);
                  setPreviewError(true);
                }}
              />
            </div>
          ) : thumb && !thumbError ? (
            <Image
              src={thumb}
              alt={title || (isLive ? "라이브 썸네일" : "녹화 썸네일")}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-105",
                lockMask && "blur-[2px] brightness-75 scale-105"
              )}
              loading="lazy"
              onError={() => {
                setThumbError(true);
                if (shouldPreview) setIsHoveredOrFocused(true);
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted/40">
              <PhotoIcon className="size-10" aria-hidden="true" />
            </div>
          )}

          {/* [Left] 상태 배지 영역 */}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1.5 z-10">
            {showLive && (
              <span className="rounded bg-danger/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm backdrop-blur-[2px]">
                LIVE
              </span>
            )}
            {showReplay && (
              <span className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-[2px]">
                다시보기
              </span>
            )}
            {showFollowers && (
              <span className="rounded bg-brand/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-[2px]">
                팔로워
              </span>
            )}
            {showPrivate && (
              <span className="inline-flex items-center gap-1 rounded bg-accent-dark/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-[2px]">
                <LockClosedIcon className="size-3" aria-hidden="true" />
                비밀
              </span>
            )}
          </div>

          {/* [Right] 카테고리 배지 (New Position) */}
          {category && (
            <div className="absolute right-2 top-2 z-10">
              <span className="flex items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm backdrop-blur-[2px]">
                {category.icon && <span>{category.icon}</span>}
                {category.kor_name}
              </span>
            </div>
          )}

          {/* 잠금 오버레이 */}
          {followersOnlyLocked && (
            <div
              className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[1px] z-20"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRequestFollow?.();
              }}
            >
              <div className="p-4 text-center">
                <p className="mb-3 text-sm font-medium text-white/90">
                  팔로워 전용 방송입니다
                </p>
                {onRequestFollow && (
                  <button
                    type="button"
                    className="btn-primary min-h-[44px] px-4 text-xs bg-white text-black hover:bg-white/90 dark:bg-white dark:text-black border-none"
                  >
                    팔로우하기
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 정보 영역 */}
        <div
          className={cn(
            "flex flex-1 flex-col justify-between",
            isGridLayout ? "gap-1.5 p-2.5 sm:gap-2 sm:p-3" : "gap-2 p-3"
          )}
        >
          <div className={cn(isGridLayout ? "space-y-1" : "space-y-1.5")}>
            <h3
              className={cn(
                "line-clamp-2 font-semibold text-primary leading-snug group-hover:text-brand dark:group-hover:text-brand-light transition-colors",
                isGridLayout ? "text-sm min-h-[1.5rem]" : "text-sm"
              )}
            >
              {title}
            </h3>

            <div className="flex items-center gap-2">
              <UserAvatar
                avatar={streamer.avatar ?? null}
                username={streamer.username}
                size="sm"
                compact
                className="pointer-events-none"
              />
            </div>
          </div>

          {/* 하단 메타 정보 */}
          {!shortDescription &&
            (formattedTags ||
              startedAtIso ||
              duration ||
              viewCount != null) && (
              <div
                className={cn(
                  "flex flex-wrap items-center gap-y-1 text-[10px] sm:text-[11px] text-muted border-t border-border/50 mt-auto min-w-0",
                  isGridLayout ? "gap-x-1.5 pt-1.5" : "gap-x-2 pt-2"
                )}
              >
                {/* 1. 태그 (존재하면 우선 표시) */}
                {formattedTags ? (
                  <span
                    className={cn(
                      "truncate font-medium text-brand dark:text-brand-light",
                      isGridLayout
                        ? "max-w-[96px] sm:max-w-[150px]"
                        : "max-w-[100px] sm:max-w-[150px]"
                    )}
                  >
                    {formattedTags}
                  </span>
                ) : null}

                {/* 태그가 있고 뒤에 내용이 더 있으면 구분선 */}
                {formattedTags &&
                  (startedAtIso || duration || viewCount != null) && (
                    <span className="text-border shrink-0">|</span>
                  )}

                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 min-w-0 flex-1">
                  {/* 2. 시간 (시작시간 or 녹화일) */}
                  {startedAtIso && (
                    <span className="shrink-0">
                      {formatToTimeAgo(startedAtIso)} {isLive ? "시작" : ""}
                    </span>
                  )}

                  {/* 3. 녹화본 메타 (길이, 조회수) */}
                  {!isLive && (
                    <>
                      {duration && duration > 0 && (
                        <>
                          <span className="text-border shrink-0">|</span>
                          <span className="shrink-0">
                            {formatDuration(duration)}
                          </span>
                        </>
                      )}
                      {typeof viewCount === "number" && (
                        <>
                          <span className="text-border shrink-0">|</span>
                          <span className="shrink-0">
                            조회 {viewCount.toLocaleString()}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
        </div>
      </Link>

      {/* 공용 비밀번호 모달 */}
      {isModalOpen && (
        <PrivateAccessModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          streamId={id}
          redirectHref={computedHref}
        />
      )}
    </article>
  );
}
