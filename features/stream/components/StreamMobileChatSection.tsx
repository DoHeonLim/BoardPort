/**
 * File Name : features/stream/components/StreamMobileChatSection.tsx
 * Description : 스트리밍 모바일 채팅 섹션(인라인 카드형 채팅 래퍼)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.11.17  임도헌   Created   모바일 채팅 섹션 기본 레이아웃
 * 2025.11.17  임도헌   Modified  채팅 확대/축소 모드 추가
 * 2025.11.17  임도헌   Modified  채팅 높이 계산
 * 2025.11.17  임도헌   Modified  레이아웃 이벤트 기반 높이 재계산
 * 2026.01.13  임도헌   Modified  [Rule 5.1] 시맨틱 토큰 적용
 * 2026.01.17  임도헌   Moved     components/stream -> features/stream/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.22  임도헌   Modified  props에 차단 목록(initialBlockedUserIds) 추가
 * 2026.03.04  임도헌   Modified  stream:chat:* 이벤트 버스 제거 및 채팅 확대 상태를 Zustand Store로 일원화
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.21  임도헌   Modified  JS 높이 고정을 제거하고 상세 레이아웃 내부 남은 높이를 그대로 상속받는 구조로 단순화
 * 2026.03.24  임도헌   Modified  모바일 채팅 확대/축소를 제거하고 인라인 채팅 카드 흐름만 유지하도록 단순화
 * 2026.03.24  임도헌   Modified  채팅 열림 상태를 스트림 상세 전용 props로 주입받도록 단순화
 * 2026.04.03  임도헌   Modified  스트림 전용 강제 퇴장 액션을 위해 방송 ID 전달 props 추가
 * 2026.04.03  임도헌   Modified  방송 단위 채팅 금지 초기 상태 전달 props 추가
 * 2026.04.03  임도헌   Modified  스트림 채팅 상단 고정 공지 초기 상태 전달 props 추가
 */
"use client";

import StreamChatRoom from "@/features/stream/components/StreamChatRoom";
import type { StreamChatMessage } from "@/features/chat/types";

interface Props {
  initialStreamMessage: StreamChatMessage[];
  streamId: number;
  streamChatRoomId: number;
  streamChatRoomhost: number;
  userId: number;
  username: string;
  initialBlockedUserIds?: number[]; // 차단한 유저의 ID들
  initialMutedUserIds?: number[]; // 호스트 기준 초기 채팅 금지 대상 유저 ID들
  initiallyMuted?: boolean; // 현재 시청자의 초기 채팅 금지 상태
  initialPinnedChatNotice?: string | null; // 채팅 상단 고정 공지 초기값
  isChatOpen: boolean;
  onCloseChat: () => void;
}

/**
 * 모바일 스트리밍 채팅 섹션 래퍼 컴포넌트
 *
 * [상태 주입 및 레이아웃 제어 로직]
 * - 스트림 상세 Client Shell에서 내려주는 채팅 열림 상태를 사용해 모바일 채팅 카드 노출 여부를 제어
 * - 채팅 섹션은 상세 레이아웃이 남겨주는 높이를 그대로 상속받아 정보 패널과 자연스럽게 세로 흐름을 구성
 * - `StreamChatRoom` 컴포넌트를 감싸는 외곽 카드 역할만 담당하며, 모바일에서는 추가 확대 토글 없이 단일 동선으로 사용
 */
export default function StreamMobileChatSection({
  initialStreamMessage,
  streamId,
  streamChatRoomId,
  streamChatRoomhost,
  userId,
  username,
  initialBlockedUserIds = [],
  initialMutedUserIds = [],
  initiallyMuted = false,
  initialPinnedChatNotice = null,
  isChatOpen,
  onCloseChat,
}: Props) {
  if (!isChatOpen) return null;

  return (
    <div className="z-20 flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm transition-all duration-200">
      <StreamChatRoom
        initialStreamMessage={initialStreamMessage}
        streamId={streamId}
        streamChatRoomId={streamChatRoomId}
        streamChatRoomhost={streamChatRoomhost}
        userId={userId}
        username={username}
        initialBlockedUserIds={initialBlockedUserIds}
        initialMutedUserIds={initialMutedUserIds}
        initiallyMuted={initiallyMuted}
        initialPinnedChatNotice={initialPinnedChatNotice}
        fillParent
        isOpen={isChatOpen}
        onCloseChat={onCloseChat}
        containerClassName="h-full border-none rounded-none shadow-none" // 모바일은 외곽 래퍼가 카드 역할 수행
      />
    </div>
  );
}
