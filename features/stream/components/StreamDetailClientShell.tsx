"use client";

/**
 * File Name : features/stream/components/StreamDetailClientShell.tsx
 * Description : 스트림 상세 페이지 전용 클라이언트 셸(채팅 열림 상태 로컬 관리)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.24  임도헌   Created   StreamChatUIStoreProvider 제거에 맞춰 스트림 상세 전용 로컬 채팅 상태 셸 추가
 * 2026.04.03  임도헌   Modified  방송 단위 채팅 금지 초기 상태를 채팅 컴포넌트로 전달
 * 2026.04.03  임도헌   Modified  스트림 채팅 상단 고정 공지 초기값을 채팅 컴포넌트로 전달
 * 2026.04.03  임도헌   Modified  반응형 레이아웃 전환 시 실시간 상태 분리 방지를 위해 채팅 인스턴스를 단일화
 * 2026.04.08  임도헌   Modified  방송 제목/설명 수정 결과와 실시간 메타 동기화를 상세 로컬 상태에 즉시 반영
 * 2026.04.16  임도헌   Modified  상세 전용 실시간 구독과 main landmark 위치를 셸에 고정해 상태/시맨틱 진입점을 일원화
 * 2026.05.17  임도헌   Modified  live-status 상태 반영을 셸 단일 구독으로 모아 상세 하위 컴포넌트 중복 구독 제거
 * 2026.05.28  임도헌   Modified  모바일 채팅 입력 중 상세 영역을 접는 입력 집중 모드 레이아웃 추가
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { StreamChatMessage } from "@/features/chat/types";
import LiveStatusRealtimeSubscriber from "@/features/stream/components/LiveStatusRealtimeSubscriber";
import StreamDetail from "@/features/stream/components/StreamDetail";
import StreamChatRoom from "@/features/stream/components/StreamChatRoom";
import StreamDetailLayout from "@/features/stream/components/StreamDetailLayout";
import StreamTopbar from "@/features/stream/components/StreamTopBar";
import { useIsMobile } from "@/hooks/useIsMobile";
import useVisualViewportHeightCssVar from "@/hooks/useVisualViewportHeightCssVar";
import type { StreamDetailDTO } from "@/features/stream/types";
import type { UserProfile } from "@/features/user/types";

interface StreamDetailClientShellProps {
  stream: StreamDetailDTO;
  viewerId: number;
  streamId: number;
  ownerProfile: Pick<
    UserProfile,
    "id" | "username" | "isFollowing" | "isBlocked" | "viewerId" | "_count"
  >;
  returnTo: string;
  isOwner: boolean;
  initialStreamMessage: StreamChatMessage[];
  streamChatRoomId: number;
  streamChatRoomhost: number;
  username: string;
  blockedUserIds: number[];
  mutedUserIds: number[];
  initiallyMuted: boolean;
}

/**
 * 스트림 상세 전용 클라이언트 셸
 *
 * - 스트림 상세 내부에서만 쓰이는 채팅 열림 상태를 로컬 state로 관리
 * - 방송 제목/설명 변경과 실시간 메타 업데이트를 로컬 stream state에 합쳐 상세 UI에 즉시 반영
 * - 상단바, 상세 레이아웃, 데스크톱/모바일 채팅 컴포넌트에 동일 상태를 props로 전달
 * - 상세 전용 실시간 상태 구독과 `main` 랜드마크를 이 셸에 모아 페이지 진입 구조를 단순하게 유지
 * - 모바일 키보드 오픈 시 상세 영역을 접고 채팅 레일 중심의 입력 레이아웃으로 전환
 * - 전역 Provider 없이도 스트림 상세 한 화면 안에서 채팅 열림/닫힘 흐름을 유지
 */
export default function StreamDetailClientShell({
  stream,
  viewerId,
  streamId,
  ownerProfile,
  returnTo,
  isOwner,
  initialStreamMessage,
  streamChatRoomId,
  streamChatRoomhost,
  username,
  blockedUserIds,
  mutedUserIds,
  initiallyMuted,
}: StreamDetailClientShellProps) {
  useVisualViewportHeightCssVar("--stream-visual-viewport-height");

  const isMobile = useIsMobile();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatComposerFocused, setIsChatComposerFocused] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const maxVisualViewportHeightRef = useRef(0); // 키보드 감지를 위한 최대 visual viewport 높이 기준값
  const [streamState, setStreamState] = useState(stream);

  useEffect(() => {
    setStreamState(stream);
  }, [stream]);

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);
  const isChatFocusMode = isMobile && isChatComposerFocused && isKeyboardOpen;
  const handleRealtimeStatus = useCallback((payload: { status?: string }) => {
    if (!payload.status) return;

    // live-status의 현재 방송 상태를 셸 상태에 먼저 반영해 iframe/오버레이 조건을 즉시 동기화
    setStreamState((prev) => ({
      ...prev,
      status: payload.status ?? prev.status,
    }));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      setIsKeyboardOpen(false);
      return;
    }

    const viewport = window.visualViewport;

    const syncKeyboardState = () => {
      maxVisualViewportHeightRef.current = Math.max(
        maxVisualViewportHeightRef.current,
        viewport.height
      );

      setIsKeyboardOpen(
        maxVisualViewportHeightRef.current - viewport.height > 120
      );
    };

    syncKeyboardState();
    viewport.addEventListener("resize", syncKeyboardState);
    viewport.addEventListener("scroll", syncKeyboardState);

    return () => {
      viewport.removeEventListener("resize", syncKeyboardState);
      viewport.removeEventListener("scroll", syncKeyboardState);
    };
  }, []);

  return (
    <div className="flex h-[var(--stream-visual-viewport-height,100dvh)] flex-col overflow-hidden bg-background transition-colors lg:h-auto lg:min-h-[100dvh] lg:overflow-visible">
      {/* 상세 전체가 공유하는 live-status 구독 지점을 셸 레벨에 고정 */}
      <LiveStatusRealtimeSubscriber
        streamId={stream.stream_id}
        onStatus={handleRealtimeStatus}
      />

      <StreamTopbar
        streamId={streamId}
        ownerId={streamState.userId}
        ownerUsername={streamState.user.username}
        title={streamState.title}
        description={streamState.description}
        visibility={streamState.visibility}
        isOwner={isOwner}
        backFallbackHref={returnTo}
        isChatOpen={isChatOpen}
        onOpenChat={openChat}
        onStreamMetaUpdated={(next) =>
          setStreamState((prev) => ({
            ...prev,
            title: next.title,
            description: next.description,
          }))
        }
      />

      {/* 플레이어/정보/채팅을 감싸는 실제 페이지 주 영역 */}
      <main className="flex min-h-0 flex-1 flex-col" role="main">
        <StreamDetailLayout
          isChatOpen={isChatOpen}
          isChatFocusMode={isChatFocusMode}
          detail={
            <StreamDetail
              stream={streamState}
              me={viewerId}
              streamId={streamId}
              ownerProfile={ownerProfile}
            />
          }
          chat={
            <StreamChatRoom
              initialStreamMessage={initialStreamMessage}
              streamId={streamId}
              streamChatRoomId={streamChatRoomId}
              streamChatRoomhost={streamChatRoomhost}
              userId={viewerId}
              username={username}
              initialBlockedUserIds={blockedUserIds}
              initialMutedUserIds={mutedUserIds}
              initiallyMuted={initiallyMuted}
              initialPinnedChatNotice={streamState.pinnedChatNotice ?? null}
              fillParent
              isOpen={isChatOpen}
              onCloseChat={closeChat}
              onComposerFocusChange={setIsChatComposerFocused}
              onStreamMetaUpdated={(next) =>
                setStreamState((prev) => ({
                  ...prev,
                  title: next.title,
                  description: next.description,
                }))
              }
              containerClassName="h-full w-full lg:h-[90dvh] lg:max-h-[90dvh]"
            />
          }
        />
      </main>
    </div>
  );
}
