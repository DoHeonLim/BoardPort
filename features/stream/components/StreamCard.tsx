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
 * 2026.03.09  임도헌   Modified  다시보기 배지를 명시 플래그 기반으로 전환해 CREATED 방송 오표시 방지
 * 2026.03.12  임도헌   Modified  사용자 업로드 GIF만 썸네일 최적화 예외 처리하도록 thumbnailAnimated 메타 연동
 * 2026.03.13  임도헌   Modified  스트림 목록/채널에서 상세 진입 시 현재 경로를 returnTo로 함께 전달
 * 2026.03.17  임도헌   Modified  카드 외곽선 톤을 border-border-subtle로 완화하고 작은 화면 메타 줄을 2단 구조로 재정리
 * 2026.03.17  임도헌   Modified  rail 레이아웃 카드 폭을 소폭 축소해 프로필 방송국 가로 스크롤 밀도 완화
 * 2026.03.18  임도헌   Modified  직접 주입되는 href도 내부 경로 기준으로 정규화해 재사용 시 raw 링크 예외를 방어
 * 2026.03.21  임도헌   Modified  프로필/채널 컨텍스트에서 스트리머 아바타/닉네임 숨김 옵션(showStreamer) 추가
 * 2026.03.22  임도헌   Modified  팔로워 전용 잠금 CTA를 시맨틱 토큰 기준으로 정리해 다크모드 톤 일관성 보강
 * 2026.03.25  임도헌   Modified  그리드 카드 썸네일 비중과 정보 영역 타이포를 재조정해 목록 가독성 보강
 * 2026.04.02  임도헌   Modified  스트림 썸네일 URL 정규화를 stream image utils 기준으로 통일
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 카드 배지/제목/메타 타이포를 text-xs·500 기준으로 정리
 * 2026.04.16  임도헌   Modified  카드 내부 프로필 링크를 비활성화해 중첩 링크/불필요 프리패치를 정리하고, 잠금 설명은 aria-describedby로 분리
 * 2026.04.16  임도헌   Modified  다시보기 첫 카드 썸네일을 우선 로드할 수 있도록 thumbnailPriority 옵션 추가
 * 2026.04.20  임도헌   Modified  스트림 카드 포커스가 묻히지 않도록 카드 컨테이너에도 keyboard-only inset 링을 보강
 * 2026.04.20  임도헌   Modified  카드 링크를 세로 축 레이아웃으로 고정해 썸네일이 정보 영역 폭을 밀어내지 않도록 정리
 * 2026.05.03  임도헌   Modified  방송/다시보기 카드에 연결 보드게임 요약 배지 표시
 * 2026.05.05  임도헌   Modified  방송 제목 우선 흐름에 맞춰 연결 보드게임을 제목 오른쪽 보조 맥락으로 재배치
 * 2026.05.05  임도헌   Modified  방송 카드 preview/잠금 처리 핸들러 JSDoc 보강
 * 2026.05.15  임도헌   Modified  레일 카드 카테고리 배지가 남는 가로폭을 우선 사용하고 부족할 때만 말줄임되도록 조정
 * 2026.05.15  임도헌   Modified  모바일 터치 환경에서 썸네일 미리보기 버튼으로 라이브 프리뷰를 켤 수 있도록 보강
 * 2026.05.18  임도헌   Modified  다시보기 카드 메타를 좋아요/댓글/조회수 Heroicons 통계 문법으로 통일
 */

"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { cn, formatToTimeAgo, formatDuration } from "@/lib/utils";
import UserAvatar from "@/components/global/UserAvatar";
import {
  PhotoIcon,
  LockClosedIcon,
  PlayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  ChatBubbleLeftIcon,
  EyeIcon,
  HeartIcon,
} from "@heroicons/react/24/solid";
import { StreamCategory, StreamVisibility } from "@/features/stream/types";
import type { BoardGameRelationOption } from "@/features/boardgame/types/public";
import { STREAM_VISIBILITY } from "@/features/stream/constants";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { toStreamThumbnailPublicUrl } from "@/features/stream/utils/image";
import BoardGameSummaryBadge from "@/features/boardgame/components/BoardGameSummaryBadge";

const PrivateAccessModal = dynamic(
  () => import("@/features/stream/components/PrivateAccessModal"),
  { ssr: false }
);

interface StreamCardProps {
  id: number /** unlock 타깃(원본 streamId 권장) */;
  vodIdForRecording?: number /** 녹화본 페이지로 이동할 때 사용할 VodAsset id (없으면 id로 폴백) */;
  title: string;
  thumbnail?: string | null;
  thumbnailAnimated?: boolean;
  isLive: boolean /** 라이브 여부 (false면 다시보기 배지 표시) */;
  showReplayBadge?: boolean;
  streamer: { username: string; avatar?: string | null };
  startedAt?:
    | Date
    | string
    | null /** 서버에서 Date로 오기도 하므로 넓혀서 수용 */;
  category?: StreamCategory | null;
  tags?: { name: string }[];
  boardGames?: Array<{ boardGame: BoardGameRelationOption }>;
  duration?: number; // 초 단위
  viewCount?: number; // 조회수
  likeCount?: number; // 다시보기 좋아요 수
  commentCount?: number; // 다시보기 댓글 수
  isLiked?: boolean; // 현재 사용자의 다시보기 좋아요 여부
  shortDescription?: boolean;
  href?: string /** 직접 지정하면 우선 사용, 없으면 isLive 기준으로 기본 경로 계산 */;
  // 서버 플래그
  requiresPassword?: boolean /** PRIVATE 접근 필요 여부(언락 전). 언락 후 false가 될 수 있음 */;
  isFollowersOnly?: boolean /** FOLLOWERS 타입 여부(형식) — 전달 안 되면 visibility로 판정 */;
  followersOnlyLocked?: boolean /** 비팔로워라 접근 잠금일 때 true (오버레이/CTA 트리거) */;
  visibility?: StreamVisibility /** visibility가 있으면 배지/잠금 보조 판별에 사용 가능 */;
  // 옵션: 언락 이후에도 '비밀' 배지를 계속 보여주고 싶다면 명시적으로 true 전달
  isPrivateType?: boolean /** visibility === "PRIVATE" 타입 표시(언락 후에도 '비밀' 배지를 유지하고 싶을 때 사용) */;
  onRequestFollow?: () => void; // 팔로우 CTA 액션
  /** 레이아웃 모드: grid(기본), rail(가로 스크롤용 고정폭 카드) */
  layout?: "grid" | "rail";
  /** 프로필/채널처럼 소유자가 자명한 컨텍스트에서의 스트리머 정보 숨김 가능 */
  showStreamer?: boolean;
  /** LCP 후보가 되는 썸네일을 우선 로드할 때 사용 */
  thumbnailPriority?: boolean;
}

/**
 * 스트리밍 카드 컴포넌트
 *
 * [기능]
 * 1. 라이브 및 녹화본(VOD) 정보를 카드 형태로 표시
 * 2. 썸네일, 제목, 스트리머 정보, 카테고리, 태그, 메타 정보(시간, 좋아요, 댓글, 조회수 등)를 렌더링
 * 3. 접근 권한(Private, Followers Only)에 따른 잠금 UI 및 오버레이를 제공
 * 4. 데스크톱 hover/focus 또는 모바일 미리보기 버튼으로 라이브 미리보기(iframe)를 로드
 * 5. 클릭 시 권한에 따라 상세 페이지 이동, 비밀번호 모달 열기, 팔로우 요청 등을 수행
 * 6. 작은 화면에서는 태그/시간/좋아요/댓글/조회수 메타를 2단으로 분리해 카드 밀도 완화
 *
 * [권한]
 * - `PRIVATE` 방송: `requiresPassword` prop을 SSOT로 사용 (서버에서 세션의 언락 여부까지 확인하여 주입됨)
 * - `FOLLOWERS` 방송: 상위 목록/채널에서 계산한 `followersOnlyLocked` 플래그를 기준으로 잠금 UI 표시
 */
export default function StreamCard(props: StreamCardProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    id,
    vodIdForRecording,
    title,
    thumbnail,
    thumbnailAnimated = false,
    isLive,
    showReplayBadge = false,
    streamer,
    startedAt,
    category,
    tags,
    boardGames,
    duration,
    viewCount,
    likeCount,
    commentCount,
    isLiked = false,
    shortDescription = false,
    href,
    requiresPassword = false,
    isFollowersOnly,
    followersOnlyLocked = false,
    visibility,
    isPrivateType,
    onRequestFollow,
    layout = "grid",
    showStreamer = true,
    thumbnailPriority = false,
  } = props;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const thumb = useMemo(
    () => toStreamThumbnailPublicUrl(thumbnail),
    [thumbnail]
  );

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
  const currentHref = useMemo(
    () =>
      searchParams?.size ? `${pathname}?${searchParams.toString()}` : pathname,
    [pathname, searchParams]
  );
  const navigableHref = useMemo(() => {
    const safeHref = sanitizeCallbackUrl(computedHref);
    if (safeHref.includes("returnTo=")) {
      return safeHref;
    }

    const separator = safeHref.includes("?") ? "&" : "?";
    return `${safeHref}${separator}returnTo=${encodeURIComponent(currentHref)}`;
  }, [computedHref, currentHref]);

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
  const [isTouchPreviewActive, setIsTouchPreviewActive] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  // 프리뷰를 띄울 자격(락이 없고 실제 라이브일 때만)
  const shouldPreview = isLive && !lockMask;

  /**
   * hover/focus preview 시작 debounce 처리
   */
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

  /**
   * hover/focus preview 상태와 대기 타이머 정리
   */
  const endHover = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setIsHoveredOrFocused(false);
  };

  /**
   * hover가 없는 터치 환경을 위한 모바일 미리보기 버튼의 iframe preview 상태 토글
   *
   * @param e - 카드 링크 내부 버튼 클릭 이벤트
   */
  const handleTouchPreviewToggle = (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!shouldPreview) return;
    setPreviewError(false);
    setIsTouchPreviewActive((prev) => !prev);
  };

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        window.clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldPreview) {
      setIsTouchPreviewActive(false);
    }
  }, [shouldPreview]);

  // 렌더 조건: 데스크톱 hover/focus 또는 모바일 버튼 토글 시 프리뷰 허용
  const shouldRenderPreview =
    shouldPreview &&
    (isHoveredOrFocused || isTouchPreviewActive) &&
    !previewError;

  /**
   * 잠긴 방송 카드 클릭 시 follow/password 흐름 진입
   *
   * @param e - 카드 링크 클릭 이벤트
   */
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
  const showReplay = showReplayBadge;
  const showFollowers = derivedFollowersOnly;
  // 기본은 requiresPassword 기준, 필요 시 isPrivateType으로 강제 표시
  const showPrivate =
    typeof isPrivateType === "boolean" ? isPrivateType : requiresPassword;

  const ariaLabel = lockMask
    ? `${title} 접근 제한 상태`
    : undefined;

  const statusDescriptionId = lockMask
    ? `stream-card-status-${vodIdForRecording ?? id}`
    : undefined;

  const statusDescription = followersOnlyLocked
    ? "팔로워 전용 방송입니다. 팔로우 후 시청할 수 있습니다."
    : requiresPassword
      ? "비밀 방송입니다. 비밀번호 입력 후 시청할 수 있습니다."
      : null;

  // 태그 포맷팅 (#태그1 #태그2)
  const formattedTags = useMemo(() => {
    if (!tags || tags.length === 0) return null;
    // 너무 길어지면 UI 깨지므로 2개까지만 노출하거나, css line-clamp로 처리
    return tags.map((t) => `#${t.name}`).join(" ");
  }, [tags]);
  const isGridLayout = layout === "grid";
  const thumbnailSizes = isGridLayout
    ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
    : "(max-width: 640px) 216px, 232px";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm transition-[background-color,color,border-color,box-shadow] motion-safe:transition-transform duration-300",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-brand/30 dark:hover:border-brand-light/30",
        "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand has-[:focus-visible]:ring-inset has-[:focus-visible]:ring-offset-0 dark:has-[:focus-visible]:ring-brand-light",
        layout === "rail"
          ? "h-full w-[216px] flex-none snap-start sm:w-[232px]"
          : "w-full"
      )}
    >
      <Link
        href={navigableHref}
        className="focus-ring-strong-inset group flex h-full flex-1 flex-col rounded-2xl"
        onClick={handleStreamClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        aria-describedby={statusDescriptionId}
        aria-disabled={lockMask || undefined}
        prefetch={false}
      >
        {statusDescriptionId && statusDescription ? (
          <span id={statusDescriptionId} className="sr-only">
            {statusDescription}
          </span>
        ) : null}

        {/* 썸네일 영역 */}
        <div
          className={cn(
            "relative w-full border-b border-border-subtle bg-surface-dim",
            isGridLayout
              ? "aspect-[16/8.7] sm:aspect-[16/8.85] lg:aspect-[16/9]"
              : "aspect-video"
          )}
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
              sizes={thumbnailSizes}
              priority={thumbnailPriority}
              fetchPriority={thumbnailPriority ? "high" : undefined}
              className={cn(
                "object-cover transition-transform duration-300 group-hover:scale-105",
                lockMask && "blur-[2px] brightness-75 scale-105"
              )}
              unoptimized={thumbnailAnimated}
              loading={thumbnailPriority ? "eager" : "lazy"}
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

          {/* 상태 배지는 우선 노출하고, 좁은 카드에서는 카테고리 배지만 줄여 겹침을 방지 */}
          <div
            className={cn(
              "absolute inset-x-2 top-2 z-10 flex gap-1.5",
              "items-start justify-between"
            )}
          >
            <div
              className={cn(
                "flex min-w-0 shrink-0 flex-wrap gap-1.5",
                isGridLayout && category ? "max-w-[62%]" : "max-w-full"
              )}
            >
              {showLive && (
                <span className="rounded bg-danger/90 px-2 py-0.5 text-xs font-bold text-white shadow-sm backdrop-blur-[2px]">
                  LIVE
                </span>
              )}
              {showReplay && (
                <span className="rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-[2px]">
                  다시보기
                </span>
              )}
              {showFollowers && (
                <span className="rounded bg-brand/90 px-2 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-[2px]">
                  팔로워
                </span>
              )}
              {showPrivate && (
                <span className="inline-flex items-center gap-1 rounded bg-accent-dark/90 px-2 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-[2px]">
                  <LockClosedIcon className="size-3" aria-hidden="true" />
                  비밀
                </span>
              )}
            </div>

            {category && (
              <span
                className={cn(
                  "ml-auto flex min-w-0 items-center gap-1 rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white shadow-sm backdrop-blur-[2px]",
                  isGridLayout ? "max-w-[46%]" : "flex-1"
                )}
              >
                {category.icon && (
                  <span className="shrink-0">{category.icon}</span>
                )}
                <span className="truncate">{category.kor_name}</span>
              </span>
            )}
          </div>

          {shouldPreview && (
            <button
              type="button"
              onClick={handleTouchPreviewToggle}
              aria-label={
                isTouchPreviewActive ? "라이브 미리보기 닫기" : "라이브 미리보기"
              }
              className={cn(
                "absolute bottom-2 right-2 z-20 hidden size-11 items-center justify-center rounded-full border border-white/20 text-white shadow-sm backdrop-blur-[2px] transition-colors",
                "[@media(hover:none)]:inline-flex",
                isTouchPreviewActive
                  ? "bg-black/70 hover:bg-black/80"
                  : "bg-brand/90 hover:bg-brand-dark"
              )}
            >
              {isTouchPreviewActive ? (
                <XMarkIcon className="size-5" aria-hidden="true" />
              ) : (
                <PlayIcon className="ml-0.5 size-5" aria-hidden="true" />
              )}
            </button>
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
                    className="btn-primary min-h-[44px] border border-border-subtle bg-surface px-4 text-xs text-primary hover:bg-surface-dim dark:bg-surface dark:text-primary dark:hover:bg-surface-dim"
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
            isGridLayout ? "gap-2 p-3 sm:gap-2.5 sm:p-3.5" : "gap-2.5 p-3.5"
          )}
        >
          <div className={cn(isGridLayout ? "space-y-1.5" : "space-y-2")}>
            <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <h3 className="line-clamp-2 min-w-0 font-medium text-base leading-snug text-primary transition-colors group-hover:text-brand dark:group-hover:text-brand-light sm:flex-1">
                {title}
              </h3>

              <BoardGameSummaryBadge
                items={boardGames}
                className="sm:max-w-[46%] sm:justify-end"
              />
            </div>

            {showStreamer && (
              <div className="flex items-center gap-2.5">
                <UserAvatar
                  avatar={streamer.avatar ?? null}
                  username={streamer.username}
                  size="sm"
                  compact
                  disabled
                  className="pointer-events-none"
                />
              </div>
            )}

          </div>

          {/* 하단 메타 정보 */}
          {!shortDescription &&
            (formattedTags ||
              startedAtIso ||
              duration ||
              viewCount != null ||
              likeCount != null ||
              commentCount != null) && (
              <div
                className={cn(
                  "mt-auto min-w-0 border-t border-border-subtle text-xs text-muted",
                  isGridLayout ? "pt-1.5" : "pt-2"
                )}
              >
                <div className="flex min-w-0 items-end gap-2">
                  <div className="min-w-0 flex-1">
                    {formattedTags && (
                      <span
                        className={cn(
                          "block truncate font-medium text-brand dark:text-brand-light",
                          isGridLayout
                            ? "max-w-[150px] sm:max-w-[220px]"
                            : "max-w-[180px] sm:max-w-[260px]"
                        )}
                      >
                        {formattedTags}
                      </span>
                    )}

                    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      {!isLive && duration && duration > 0 && (
                        <span className="shrink-0">
                          {formatDuration(duration)}
                        </span>
                      )}
                      {!isLive &&
                        duration &&
                        duration > 0 &&
                        (typeof viewCount === "number" ||
                          typeof likeCount === "number" ||
                          typeof commentCount === "number") && (
                          <span className="text-border shrink-0">|</span>
                        )}
                      {!isLive &&
                        typeof likeCount === "number" && (
                        <span className="inline-flex shrink-0 items-center gap-1">
                          {/* 다시보기 카드의 빨간 하트는 전체 좋아요 수가 아니라 현재 사용자 좋아요 여부를 의미 */}
                          <HeartIcon
                            className={cn(
                              "size-3",
                              isLiked ? "text-rose-500" : "text-muted/70"
                            )}
                            aria-hidden="true"
                          />
                          {likeCount.toLocaleString()}
                        </span>
                      )}
                      {!isLive &&
                        typeof likeCount === "number" &&
                        typeof commentCount === "number" && (
                          <span className="text-border shrink-0">|</span>
                        )}
                      {!isLive && typeof commentCount === "number" && (
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <ChatBubbleLeftIcon
                            className="size-3 text-muted/70"
                            aria-hidden="true"
                          />
                          {commentCount.toLocaleString()}
                        </span>
                      )}
                      {!isLive &&
                        (typeof likeCount === "number" ||
                          typeof commentCount === "number") &&
                        typeof viewCount === "number" && (
                          <span className="text-border shrink-0">|</span>
                        )}
                      {!isLive && typeof viewCount === "number" && (
                        <span className="inline-flex shrink-0 items-center gap-1">
                          <EyeIcon
                            className="size-3 text-muted/70"
                            aria-hidden="true"
                          />
                          {viewCount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {startedAtIso && (
                    <span className="ml-auto shrink-0 whitespace-nowrap">
                      {formatToTimeAgo(startedAtIso)} {isLive ? "시작" : ""}
                    </span>
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
          redirectHref={navigableHref}
        />
      )}
    </article>
  );
}
