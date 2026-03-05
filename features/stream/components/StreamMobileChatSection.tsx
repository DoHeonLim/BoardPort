/**
 * File Name : features/stream/components/StreamMobileChatSection.tsx
 * Description : 스트리밍 모바일 채팅 섹션(확대 모드 지원)
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
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useStreamChatUIStore } from "@/components/global/providers/StreamChatUIStoreProvider";
import StreamChatRoom from "@/features/stream/components/StreamChatRoom";
import type { StreamChatMessage } from "@/features/chat/types";

interface Props {
  initialStreamMessage: StreamChatMessage[];
  streamChatRoomId: number;
  streamChatRoomhost: number;
  userId: number;
  username: string;
  initialBlockedUserIds?: number[]; // 차단한 유저의 ID들
}

/**
 * 모바일 스트리밍 채팅 섹션 래퍼 컴포넌트
 *
 * [상태 주입 및 레이아웃 제어 로직]
 * - 모바일 환경(키보드 활성화 시) 레이아웃 깨짐 방지를 위한 동적 높이(`computedHeight`) 계산 로직 적용
 * - `useStreamChatUIStore` 상태 구독을 통한 채팅창 확대/축소(`isExpanded`) 상태 전역 제어
 * - 화면 리사이즈 및 회전(Orientation) 이벤트 감지 기반 높이 재계산 로직 포함
 * - `StreamChatRoom` 컴포넌트 호출 및 하위 모달(확대 토글, 차단 등) 상태 전달
 */
export default function StreamMobileChatSection({
  initialStreamMessage,
  streamChatRoomId,
  streamChatRoomhost,
  userId,
  username,
  initialBlockedUserIds = [],
}: Props) {
  const expanded = useStreamChatUIStore((s) => s.isChatExpanded);
  const setChatExpanded = useStreamChatUIStore((s) => s.setChatExpanded);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [computedHeight, setComputedHeight] = useState<number | null>(null);

  /**
   * 채팅 영역 높이 계산 함수
   * - 현재 요소의 화면상 top 위치부터 뷰포트 바닥까지의 높이를 계산
   * - 최소 높이(300px)를 보장하여 키보드가 올라와도 UI가 깨지지 않도록 함
   */
  const updateHeight = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const vh = window.innerHeight;
    // 하단 안전 영역 및 최소 높이 고려
    const h = Math.max(300, vh - rect.top);
    setComputedHeight(h);
  }, []);

  /**
   * 화면 리사이즈 및 회전 감지
   * - 높이를 실시간으로 재계산하여 레이아웃을 맞춤
   */
  useEffect(() => {
    updateHeight();
    window.addEventListener("resize", updateHeight);
    window.addEventListener("orientationchange", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
    };
  }, [updateHeight]);

  /**
   * 채팅 확대/축소 상태 변경 시 레이아웃 계산을 한 번 더 수행
   */
  useEffect(() => {
    requestAnimationFrame(() => updateHeight());
  }, [expanded, updateHeight]);

  return (
    <div
      ref={containerRef}
      style={computedHeight != null ? { height: computedHeight } : undefined}
      className="flex flex-col w-full bg-background border-t border-border"
    >
      <StreamChatRoom
        initialStreamMessage={initialStreamMessage}
        streamChatRoomId={streamChatRoomId}
        streamChatRoomhost={streamChatRoomhost}
        userId={userId}
        username={username}
        initialBlockedUserIds={initialBlockedUserIds}
        fillParent
        showExpandToggle
        isExpanded={expanded}
        onToggleExpand={() => setChatExpanded(!expanded)}
        containerClassName="border-none rounded-none shadow-none" // 모바일은 카드 스타일 제거
      />
    </div>
  );
}
