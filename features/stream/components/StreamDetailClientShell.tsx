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
 */

import { useState } from "react";
import type { StreamChatMessage } from "@/features/chat/types";
import StreamDetail from "@/features/stream/components/StreamDetail";
import StreamChatRoom from "@/features/stream/components/StreamChatRoom";
import StreamDetailLayout from "@/features/stream/components/StreamDetailLayout";
import StreamTopbar from "@/features/stream/components/StreamTopBar";
import type { StreamDetailDTO } from "@/features/stream/service/detail";
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
 * - 상단바, 상세 레이아웃, 데스크톱/모바일 채팅 컴포넌트에 동일 상태를 props로 전달
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
  const [isChatOpen, setIsChatOpen] = useState(true);

  const openChat = () => setIsChatOpen(true);
  const closeChat = () => setIsChatOpen(false);

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-background transition-colors lg:h-auto lg:min-h-[100dvh] lg:overflow-visible">
      <StreamTopbar
        streamId={streamId}
        ownerId={stream.userId}
        ownerUsername={stream.user.username}
        title={stream.title}
        visibility={stream.visibility}
        isOwner={isOwner}
        backFallbackHref={returnTo}
        isChatOpen={isChatOpen}
        onOpenChat={openChat}
      />

      <StreamDetailLayout
        isChatOpen={isChatOpen}
        detail={
          <StreamDetail
            stream={stream}
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
            initialPinnedChatNotice={stream.pinnedChatNotice ?? null}
            fillParent
            isOpen={isChatOpen}
            onCloseChat={closeChat}
            containerClassName="h-full w-full lg:h-[90dvh] lg:max-h-[90dvh]"
          />
        }
      />
    </div>
  );
}
