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
 * 2026.04.25  임도헌   Modified  실시간 방송 상태를 부모 상태에 반영해 새로고침 없이 상세 iframe이 표시되도록 보강
 * 2026.05.03  임도헌   Modified  방송 상세 정보 패널에 연결된 보드게임 카탈로그 칩 노출
 * 2026.05.04  임도헌   Modified  방송에서 다루는 보드게임을 상세 공통 카드 스타일로 표시
 * 2026.05.05  임도헌   Modified  방송 상태 정규화와 반응형 패널 동기화 JSDoc 보강
 * 2026.05.17  임도헌   Modified  live-status 직접 구독 제거 후 셸에서 내려온 상태 props 기준으로 렌더링
 * 2026.05.28  임도헌   Modified  모바일 플레이어와 정보 패널을 화면 폭에 맞게 정리
 * 2026.05.29  임도헌   Modified  셸 상태 기준으로 모바일 방송 정보 노출, 높이 제한, 스크롤 기준 정리
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

import { useEffect, useState, type MouseEvent } from "react";
import TimeAgo from "@/components/ui/TimeAgo";
import UserAvatar from "@/components/global/UserAvatar";
import StreamStatusOverlay from "@/features/stream/components/StreamDetail/StreamStatusOverlay";
import StreamCategoryTags from "@/features/stream/components/StreamDetail/StreamCategoryTags";
import StreamDescription from "@/features/stream/components/StreamDetail/StreamDescription";
import StreamSecretInfo from "@/features/stream/components/StreamDetail/StreamSecretInfo";
import StreamTitle from "@/features/stream/components/StreamDetail/StreamTitle";
import LinkedBoardGameChips from "@/features/boardgame/components/LinkedBoardGameChips";
import { useFollowController } from "@/features/user/hooks/useFollowController";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import type { StreamDetailDTO, StreamStatus } from "@/features/stream/types";
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
  /** 모바일 상단바 노출 또는 채팅 닫힘 상태에 따른 방송 정보 패널 노출 여부 */
  mobileInfoOpen?: boolean;
  /** 모바일 채팅 열림 중 방송 정보가 채팅 영역을 밀어내지 않도록 높이 제한 */
  limitMobileInfoHeight?: boolean;
  /** 모바일 플레이어 클릭으로 상단바를 보이거나 숨길지 여부 */
  shouldCaptureTopbarToggle?: boolean;
  /** 모바일 상단바 토글 핸들러 */
  onToggleMobileTopbar?: () => void;
}

/**
 * 서버/Realtime에서 들어온 방송 상태 값을 상세 화면 기준 enum으로 정규화
 *
 * @param status - 서버 또는 브로드캐스트에서 받은 상태 값
 * @returns 상세 화면에서 사용할 StreamStatus
 */
function normalizeStreamStatus(status?: StreamStatus | string | null) {
  return ((status?.toUpperCase?.() ?? "DISCONNECTED") as StreamStatus);
}

/**
 * 스트리밍 상세 정보 및 메타 컨테이너 컴포넌트
 *
 * [상태 주입 및 레이아웃 제어 로직]
 * - 모바일(기본 숨김)과 데스크톱(기본 펼침) 화면 크기에 따른 정보 패널 초기 상태 자동 구성
 * - Cloudflare iframe 기반 플레이어 위에는 `StreamStatusOverlay`만 배치하고, 모바일 정보 노출은 셸 상태로 제어
 * - 셸에서 동기화한 `live-status` 상태를 props로 받아 새로고침 없이 iframe 렌더 조건을 갱신
 * - 실제 라이브(CONNECTED) 상태에서만 iframe을 붙이고, 그 외 상태는 썸네일/검은 배경 fallback으로 전환해 상세 초기 비용 완화
 * - 모바일은 cross-origin iframe 터치 레이어와 충돌하지 않도록 별도 플레이어 버튼 없이 상세 정보 패널을 제어
 * - 정보 패널 안에서는 제목, 태그, 스트리머 행, 설명, 소유자 전용 송출 정보를 조건에 맞게 렌더링
 * - owner는 모바일에서도 방송 정보 패널을 열면 RTMP URL/스트림 키 확인 가능
 */
export default function StreamDetail({
  stream,
  me,
  streamId,
  ownerProfile,
  mobileInfoOpen = false,
  limitMobileInfoHeight = false,
  shouldCaptureTopbarToggle = false,
  onToggleMobileTopbar,
}: StreamDetailProps) {
  const isOwner = !!me && stream.user.id === me;
  const currentStatus = normalizeStreamStatus(stream.status);

  // 데스크톱 정보 패널은 화면 폭에 맞춰 기본 열림 상태를 유지
  const [desktopInfoOpen, setDesktopInfoOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");

    const apply = () => {
      setIsDesktop(mql.matches);
      setDesktopInfoOpen(mql.matches);
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
  const showInfoSection = isDesktop ? desktopInfoOpen : mobileInfoOpen;
  const shouldRenderLivePlayer = currentStatus === "CONNECTED";
  const handlePlayerClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!shouldCaptureTopbarToggle) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest("a,button,[role='button'],input,textarea,select")) {
      return;
    }

    onToggleMobileTopbar?.();
  };
  const handlePlayerToggleButtonClick = (
    event: MouseEvent<HTMLButtonElement>
  ) => {
    event.stopPropagation();
    onToggleMobileTopbar?.();
  };

  return (
    <div className="relative lg:space-y-2">
      <div
        className={cn(
          "relative aspect-video overflow-hidden bg-black shadow-sm lg:rounded-2xl lg:border lg:border-black/10 dark:lg:border-white/10",
          shouldCaptureTopbarToggle && "cursor-pointer"
        )}
        onClick={handlePlayerClick}
      >
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
        {shouldCaptureTopbarToggle && (
          <button
            type="button"
            aria-label="방송 상단 메뉴 토글"
            className="absolute inset-0 z-20 cursor-default bg-transparent lg:hidden"
            onClick={handlePlayerToggleButtonClick}
          />
        )}
        <StreamStatusOverlay
          username={stream.user.username}
          status={currentStatus}
          isOwner={isOwner}
        />
      </div>

      {/* 정보 패널 (아코디언) */}
      <section
        className={cn(
          "overflow-hidden border-y border-border-subtle bg-surface transition-colors lg:rounded-2xl lg:border lg:shadow-[0_16px_36px_rgba(15,23,42,0.07)] lg:ring-1 lg:ring-black/[0.045] dark:shadow-sm dark:lg:ring-white/[0.03]",
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
            aria-expanded={desktopInfoOpen}
            aria-label={desktopInfoOpen ? "방송 정보 숨기기" : "방송 정보 보기"}
            onClick={() => setDesktopInfoOpen((v) => !v)}
          >
            <span className="mr-1 whitespace-nowrap text-xs">
              {desktopInfoOpen ? "정보 숨기기" : "정보 보기"}
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 transition-transform",
                desktopInfoOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>
        </div>

        {showInfoSection && (
          <div
            className={cn(
              "px-3 pb-3.5 pt-2.5 sm:px-4 sm:pb-5 sm:pt-4 lg:max-h-none lg:overflow-visible lg:border-t lg:border-border-subtle",
              limitMobileInfoHeight &&
                "max-lg:max-h-[32dvh] max-lg:overflow-y-auto max-lg:overscroll-contain"
            )}
          >
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

            <div className="mt-3">
              <LinkedBoardGameChips
                items={
                  stream.board_games?.map(({ boardGame }) => boardGame) ?? []
                }
                title="방송에서 다루는 보드게임"
                variant="cards"
              />
            </div>

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
