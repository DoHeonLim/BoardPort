/**
 * File Name : features/stream/components/StreamDetail/index.tsx
 * Description : 스트리밍 상세 메인 컴포넌트 (세부 UI 모듈화 포함)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.19  임도헌   Created
 * 2024.11.19  임도헌   Modified  스트리밍 상세 컴포넌트 추가
 * 2024.11.21  임도헌   Modified  Link를 streams/[id]/page에서 StreamDetail로 옮김
 * 2024.11.21  임도헌   Modified  스트리밍 하기 위한 정보들 본인만 보이게 변경
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2025.05.16  임도헌   Modified  UI 변경, 실시간 시청자 수 기능 추가
 * 2025.07.31  임도헌   Modified  분리된 세부 컴포넌트 통합 구성
 * 2025.08.23  임도헌   Modified  Cloudflare 플레이어 ENV 가드 추가, ENDED 오버레이 조건 명시
 * 2025.09.09  임도헌   Modified  ENV 변수 재사용 버그 수정, started_at 직렬화 가드, 중복 비교 정리
 * 2025.09.13  임도헌   Modified  iframe 자동재생 추가
 * 2025.09.15  임도헌   Modified  레이아웃 재배치: 제목→메타(시작시간+태그 한줄)→유저
 * 2025.09.16  임도헌   Modified  Broadcast 스키마 정렬(stream_id/stream_key optional)
 * 2025.09.17  임도헌   Modified  삭제 버튼을 녹화 페이지로 이동 (상세에서는 노출하지 않음)
 * 2025.11.16  임도헌   Modified  모든 정보 블록을 하나의 아코디언으로 접기/펼치기(모바일 기본 접힘)
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용 (bg-surface, border-border)
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.03.04  임도헌   Modified  stream:chat:expand/layout-updated 이벤트 버스 제거, hiddenByChat 상태를 Zustand selector로 대체
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.20  임도헌   Modified  플레이어 아래 정보를 summary + detail 구조로 재구성하고 StreamStatusOverlay 기반 상태 표현으로 전환
 * 2026.03.21  임도헌   Modified  모바일은 정보를 기본 숨김 처리하고 플레이어 버튼으로만 노출해 채팅 공간을 우선 확보
 * 2026.03.21  임도헌   Modified  모바일 정보 밀도를 낮추고 스트리머명 옆 팔로우 CTA를 배치해 액션 우선순위를 정리
 * 2026.03.24  임도헌   Modified  모바일 정보 패널 밀도를 추가로 낮추고 데스크톱 유저 행 폭을 압축해 시각적 소음을 줄임
 * 2026.03.24  임도헌   Modified  모바일은 방송 정보 토글만 남기고 채팅 확대/축소 흐름을 제거해 상호작용을 단순화
 * 2026.03.24  임도헌   Modified  모바일 정보 토글 칩 존재감을 낮추고 데스크톱 정보 헤더 밀도를 줄여 플레이어/정보/채팅 리듬을 정리
 * 2026.03.24  임도헌   Modified  다크 모드 열림 상태 정보 칩을 밝은 흰색 대신 어두운 표면 톤으로 맞춰 오버레이와의 이질감을 완화
 * 2026.03.24  임도헌   Modified  모바일 owner도 정보 패널을 열면 송출 정보를 확인할 수 있도록 데스크톱 전용 가드를 제거
 * 2026.03.24  임도헌   Modified  데스크톱 라이트 모드 위계를 조금 더 분리하고 owner 송출 정보 영역 폭을 줄여 관리 정보의 무게를 완화
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 상세 정보 패널 타이포를 text-xs·sm·500 기준으로 정리
 * 2026.04.16  임도헌   Modified  CONNECTED 상태에서만 iframe을 렌더링하고 종료/준비 상태는 썸네일 fallback으로 전환해 초기 로드 비용을 완화
 * ===============================================================================================
 * StreamDetail (방송 상세) 페이지를 구성하는 UI 요소들을 분리해 모아둔 디렉토리
 * - StreamStatusOverlay.tsx: 상태에 따라 플레이어 위에 노출되는 공통 상태 오버레이
 * - StreamTitle.tsx        : 방송 제목
 * - StreamCategoryTags.tsx : 카테고리 및 태그 뱃지
 * - StreamDescription.tsx  : 방송 설명 (더보기/접기)
 * - StreamSecretInfo.tsx   : 소유자 전용 송출 정보
 * - index.tsx              : 위 컴포넌트들을 조합한 최종 정보 패널 컨테이너
 * ===============================================================================================
 */

"use client";

import { useEffect, useState } from "react";
import TimeAgo from "@/components/ui/TimeAgo";
import UserAvatar from "@/components/global/UserAvatar";
import StreamStatusOverlay from "@/features/stream/components/StreamDetail/StreamStatusOverlay";
import StreamCategoryTags from "@/features/stream/components/StreamDetail/StreamCategoryTags";
import StreamDescription from "@/features/stream/components/StreamDetail/StreamDescription";
import StreamSecretInfo from "@/features/stream/components/StreamDetail/StreamSecretInfo";
import StreamTitle from "@/features/stream/components/StreamDetail/StreamTitle";
import { useFollowController } from "@/features/user/hooks/useFollowController";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { StreamDetailDTO } from "@/features/stream/service/detail";
import type { UserProfile } from "@/features/user/types";
import { cn } from "@/lib/utils";

interface StreamDetailProps {
  stream: StreamDetailDTO;
  me: number | null; // 현재 로그인 유저 id
  streamId: number; // Broadcast id
  ownerProfile: Pick<
    UserProfile,
    "id" | "username" | "isFollowing" | "isBlocked" | "viewerId" | "_count"
  >;
}

/**
 * 스트리밍 상세 정보 및 메타 컨테이너 컴포넌트
 *
 * [상태 주입 및 레이아웃 제어 로직]
 * - 모바일(기본 숨김)과 데스크톱(기본 펼침) 화면 크기에 따른 정보 패널 초기 상태 자동 구성
 * - Cloudflare iframe 기반 플레이어 위에는 `StreamStatusOverlay`를 배치하고, 모바일 정보 토글은 플레이어 우상단 칩으로 제어
 * - 실제 라이브(CONNECTED) 상태에서만 iframe을 붙이고, 그 외 상태는 썸네일/검은 배경 fallback으로 전환해 상세 초기 비용을 줄인다
 * - 모바일은 cross-origin iframe 제약 때문에 플레이어 자체 클릭 대신 플레이어 안 우상단 정보 토글 버튼으로 상세 정보를 열고 닫는다
 * - 정보 패널 안에서는 제목, 태그, 스트리머 행, 설명, 소유자 전용 송출 정보를 조건에 맞게 렌더링
 * - owner는 모바일에서도 방송 정보 패널을 열면 RTMP URL/스트림 키를 확인할 수 있다
 */
export default function StreamDetail({
  stream,
  me,
  streamId,
  ownerProfile,
}: StreamDetailProps) {
  const isOwner = !!me && stream.user.id === me;

  // 모바일은 기본 숨김, 데스크톱은 기본 펼침으로 시작
  const [opened, setOpened] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const apply = () => {
      setIsDesktop(mql.matches);
      setOpened(mql.matches);
    };
    apply();
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, []);

  const canFollowOwner =
    !!ownerProfile.viewerId &&
    ownerProfile.viewerId !== ownerProfile.id &&
    !ownerProfile.isBlocked;
  const { isFollowing, isPending, onToggleFollow } = useFollowController({
    ownerId: ownerProfile.id,
    ownerUsername: ownerProfile.username,
    initialIsFollowing: !!ownerProfile.isFollowing,
    initialFollowerCount: ownerProfile._count.followers ?? 0,
    initialFollowingCount: ownerProfile._count.following ?? 0,
    viewerId: ownerProfile.viewerId ?? undefined,
  });
  const showInfoSection = isDesktop || opened;
  const normalizedStatus = (stream.status?.toUpperCase?.() ??
    "DISCONNECTED") as "CONNECTED" | "ENDED" | "DISCONNECTED" | "READY";
  const hasStatusOverlay = normalizedStatus !== "CONNECTED";
  const shouldRenderLivePlayer = normalizedStatus === "CONNECTED";

  return (
    <div className="relative space-y-2">
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-black/10 bg-black shadow-sm dark:border-white/10 sm:mb-0">
        {/* CONNECTED일 때만 실제 플레이어를 붙이고, 나머지는 fallback 썸네일/배경으로 유지 */}
        {(() => {
          if (!shouldRenderLivePlayer) {
            if (stream.thumbnail) {
              return (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${stream.thumbnail})` }}
                  aria-hidden="true"
                />
              );
            }

            return <div className="absolute inset-0 bg-black" aria-hidden="true" />;
          }

          const DOMAIN = process.env.NEXT_PUBLIC_CLOUDFLARE_STREAM_DOMAIN;
          if (!DOMAIN) {
            return (
              <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-red-300">
                환경변수 미설정
              </div>
            );
          }
          const params = new URLSearchParams({
            autoplay: "1",
            muted: "1",
            preload: "auto",
          });
          const src = `${DOMAIN}/${stream.stream_id}/iframe?${params.toString()}`;
          return (
            <iframe
              title={`Live stream player`}
              className="absolute inset-0 h-full w-full"
              src={src}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              loading="lazy"
              allowFullScreen
            />
          );
        })()}
        <StreamStatusOverlay
          username={stream.user.username}
          status={stream.status}
          streamId={stream.stream_id}
          isOwner={isOwner}
        />
        <button
          type="button"
          className={cn(
            "focus-ring-soft absolute right-3 top-3 z-50 inline-flex min-h-[30px] items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium shadow-[0_8px_20px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-colors lg:hidden",
            opened
              ? "border-black/8 bg-surface-dim text-primary dark:border-white/10 dark:bg-surface-dim dark:text-white"
              : hasStatusOverlay
                ? "border-black/10 bg-white text-primary dark:border-white/10 dark:bg-black/45 dark:text-white/90"
                : "border-border-subtle bg-surface text-muted hover:text-primary"
          )}
          aria-pressed={opened}
          aria-label={opened ? "방송 정보 숨기기" : "방송 정보 보기"}
          onClick={() => setOpened((prev) => !prev)}
        >
          {opened ? "정보 숨기기" : "방송 정보"}
        </button>
      </div>

      {/* 정보 패널 (아코디언) */}
      <section
        className={cn(
          "overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-[0_10px_28px_rgba(15,23,42,0.05)] ring-1 ring-black/[0.03] transition-colors lg:shadow-[0_16px_36px_rgba(15,23,42,0.07)] lg:ring-black/[0.045] dark:shadow-sm dark:ring-white/[0.03]",
          !showInfoSection && "hidden"
        )}
      >
        <div className="hidden items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-2.5 lg:flex">
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            방송 정보
          </div>

          <button
            type="button"
            className="focus-ring-soft inline-flex min-h-[28px] shrink-0 items-center justify-end rounded px-1 text-muted/90 transition-colors hover:text-primary"
            aria-expanded={opened}
            aria-label={opened ? "방송 정보 숨기기" : "방송 정보 보기"}
            onClick={() => setOpened((v) => !v)}
          >
            <span className="mr-1 whitespace-nowrap text-xs">
              {opened ? "정보 숨기기" : "정보 보기"}
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                opened && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
        </div>

        {opened && (
          <div className="px-3 pb-3.5 pt-2.5 sm:px-4 sm:pb-5 sm:pt-4 lg:max-h-none lg:overflow-visible lg:border-t lg:border-border-subtle max-lg:max-h-[32dvh] max-lg:overflow-y-auto max-lg:overscroll-contain">
            <div className="min-w-0">
              <StreamTitle
                title={stream.title}
                compact
                size="sm"
                className="mb-0 sm:text-base"
              />

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted sm:mt-2.5 sm:gap-2">
                <StreamCategoryTags
                  category={stream.category ?? undefined}
                  tags={stream.tags ?? undefined}
                />
                {isDesktop && stream.started_at && (
                  <span className="text-xs text-muted">
                    <TimeAgo date={stream.started_at} className="text-muted" />{" "}
                    시작
                  </span>
                )}
              </div>

              <div className="mt-2 flex w-full items-center gap-2 rounded-xl bg-surface-dim/30 px-2.5 py-1.5 sm:mt-3.5 sm:gap-3 sm:px-3 sm:py-2.5 lg:inline-flex lg:w-auto lg:min-w-[380px] lg:max-w-[480px] xl:min-w-[420px] xl:max-w-[540px]">
                <UserAvatar
                  avatar={stream.user.avatar}
                  username={stream.user.username}
                  size="sm"
                  showUsername={false}
                  prefetch={false}
                />
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-none">
                  <div className="min-w-0 max-w-[180px] sm:max-w-[220px] lg:max-w-[200px] xl:max-w-[230px]">
                    <div className="truncate text-sm font-medium text-primary sm:text-base">
                      {stream.user.username}
                    </div>
                  </div>
                  {canFollowOwner && (
                    <button
                      type="button"
                      onClick={onToggleFollow}
                      disabled={isPending}
                      aria-pressed={isFollowing}
                      aria-busy={isPending}
                      aria-label={
                        isPending
                          ? "팔로우 처리 중"
                          : isFollowing
                            ? "팔로우 취소"
                            : "팔로우"
                      }
                      className={cn(
                        "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors lg:px-3.5",
                        "disabled:cursor-not-allowed disabled:opacity-60",
                        isFollowing ? "focus-ring-soft" : "focus-ring-strong",
                        isFollowing
                          ? "border-border-strong bg-surface text-muted hover:border-danger/30 hover:bg-danger/5 hover:text-danger"
                          : "border-transparent bg-brand text-white hover:bg-brand-dark"
                      )}
                    >
                      {isPending
                        ? "처리 중..."
                        : isFollowing
                          ? "팔로우 취소"
                          : "팔로우"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {stream.description && (
              <div className="mt-2.5 border-t border-border-subtle pt-2.5 text-sm leading-6 text-primary sm:mt-3.5 sm:pt-3.5">
                <StreamDescription description={stream.description} />
              </div>
            )}

            {isOwner && (
              <div className="mt-3 border-t border-border-subtle pt-3 sm:mt-3.5 sm:pt-3.5 lg:max-w-[640px]">
                <StreamSecretInfo broadcastId={streamId} />
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
