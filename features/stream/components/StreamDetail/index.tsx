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
 */

"use client";

import { useEffect, useState } from "react";
import TimeAgo from "@/components/ui/TimeAgo";
import UserAvatar from "@/components/global/UserAvatar";
import LiveStatusButton from "@/features/stream/components/StreamDetail/LiveStatusButton";
import StreamEndedOverlay from "@/features/stream/components/StreamDetail/StreamEndedOverlay";
import StreamCategoryTags from "@/features/stream/components/StreamDetail/StreamCategoryTags";
import StreamDescription from "@/features/stream/components/StreamDetail/StreamDescription";
import StreamSecretInfo from "@/features/stream/components/StreamDetail/StreamSecretInfo";
import LiveViewerCount from "@/features/stream/components/StreamDetail/LiveViewerCount";
import StreamTitle from "@/features/stream/components/StreamDetail/StreamTitle";
import { ChevronDownIcon } from "@heroicons/react/24/solid";
import type { StreamDetailDTO } from "@/features/stream/lib/getBroadcastDetail";
import { cn } from "@/lib/utils";

interface StreamDetailProps {
  stream: StreamDetailDTO;
  /** 현재 로그인 유저 id */
  me: number | null;
  /** Broadcast id */
  streamId: number;
}

export default function StreamDetail({
  stream,
  me,
  streamId,
}: StreamDetailProps) {
  const isOwner = !!me && stream.user.id === me;

  // 모바일 기본 접힘, 데스크톱 기본 펼침
  const [opened, setOpened] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1280px)");
    const apply = () => setOpened(mql.matches);
    apply();
    mql.addEventListener?.("change", apply);
    return () => mql.removeEventListener?.("change", apply);
  }, []);

  // 채팅 확대 모드일 때 모바일에서 방송 정보 숨기기
  const [hiddenByChat, setHiddenByChat] = useState(false);
  useEffect(() => {
    const onChatExpand = (event: Event) => {
      const { detail } = event as CustomEvent<{ expanded?: boolean }>;
      if (typeof detail?.expanded === "boolean") {
        setHiddenByChat(detail.expanded);
      }
    };
    window.addEventListener(
      "stream:chat:expand",
      onChatExpand as EventListener
    );
    return () => {
      window.removeEventListener(
        "stream:chat:expand",
        onChatExpand as EventListener
      );
    };
  }, []);

  // hiddenByChat 값이 바뀔 때마다, 레이아웃이 다시 잡힌 후라고 간주하고 신호를 보냄
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("stream:chat:layout-updated", {
        detail: { hiddenByChat },
      })
    );
  }, [hiddenByChat]);

  return (
    <div className="relative">
      {/* 우상단 실시간 시청자 수 */}
      <div className="absolute top-2 right-2 z-10">
        {me != null && <LiveViewerCount streamId={streamId} me={me} />}
      </div>

      <LiveStatusButton status={stream.status} streamId={stream.stream_id} />

      <div className="relative mb-1 aspect-video overflow-hidden bg-black rounded-xl shadow-sm border border-black/10 dark:border-white/10">
        {(() => {
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
        {stream.status === "ENDED" && (
          <StreamEndedOverlay username={stream.user.username} />
        )}
      </div>

      {/* 정보 패널 */}
      <section
        className={cn(
          "mb-1 overflow-hidden rounded-xl border transition-colors",
          "bg-surface border-border",
          hiddenByChat && "hidden xl:block"
        )}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-surface-dim transition-colors"
          aria-expanded={opened}
          onClick={() => setOpened((v) => !v)}
        >
          <span className="text-sm md:text-base font-semibold text-primary">
            방송 정보
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">
              {opened ? "접기" : "펼치기"}
            </span>
            <ChevronDownIcon
              className={cn(
                "size-4 text-muted transition-transform",
                opened && "rotate-180"
              )}
              aria-hidden="true"
            />
          </div>
        </button>

        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
            opened ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="min-h-0 overflow-hidden px-4 pb-4">
            <div className="pt-2">
              <StreamTitle title={stream.title} />
            </div>

            <div className="mb-4 mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <StreamCategoryTags
                category={stream.category ?? undefined}
                tags={stream.tags ?? undefined}
              />
              {stream.started_at && (
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <TimeAgo
                    date={stream.started_at}
                    className="text-muted"
                  />{" "}
                  시작
                </span>
              )}
            </div>

            <div className="mb-4 flex items-center gap-3 p-3 rounded-lg bg-surface-dim/50 border border-border/50">
              <UserAvatar
                avatar={stream.user.avatar}
                username={stream.user.username}
                size="md"
              />
            </div>

            {stream.description && (
              <div className="mt-2 text-sm text-primary">
                <StreamDescription description={stream.description} />
              </div>
            )}

            {isOwner && (
              <div className="mt-4 pt-4 border-t border-border">
                <StreamSecretInfo broadcastId={streamId} />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
