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
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import StreamChatRoom from "@/features/stream/components/StreamChatRoom";
import type { StreamChatMessage } from "@/types/chat";

interface Props {
  initialStreamMessage: StreamChatMessage[];
  streamChatRoomId: number;
  streamChatRoomhost: number;
  userId: number;
  username: string;
}

export default function StreamMobileChatSection({
  initialStreamMessage,
  streamChatRoomId,
  streamChatRoomhost,
  userId,
  username,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [computedHeight, setComputedHeight] = useState<number | null>(null);

  /**
   * 채팅 영역 높이 계산 함수
   * - 현재 요소의 화면상 top 위치부터 뷰포트 바닥까지의 높이를 계산합니다.
   * - 최소 높이(300px)를 보장하여 키보드가 올라와도 UI가 깨지지 않도록 합니다.
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
   * Topbar에서 "채팅 닫기" 이벤트 수신
   * - 닫힐 때 확대 상태를 초기화하고 높이를 재계산합니다.
   */
  useEffect(() => {
    const handleState = (event: Event) => {
      const { detail } = event as CustomEvent<{ open?: boolean }>;
      if (detail?.open === false) {
        setExpanded(false);
        // 닫힐 때도 현재 위치 기준 높이 한 번 정리 (재열림 대비)
        updateHeight();
      }
    };
    window.addEventListener("stream:chat:state", handleState as EventListener);
    return () =>
      window.removeEventListener(
        "stream:chat:state",
        handleState as EventListener
      );
  }, [updateHeight]);

  /**
   * 화면 리사이즈 및 회전 감지
   * - 높이를 실시간으로 재계산하여 레이아웃을 맞춥니다.
   */
  useEffect(() => {
    updateHeight();
    window.addEventListener("resize", updateHeight);
    // 모바일 가로/세로 회전 대응
    window.addEventListener("orientationchange", updateHeight);
    return () => {
      window.removeEventListener("resize", updateHeight);
      window.removeEventListener("orientationchange", updateHeight);
    };
  }, [updateHeight]);

  /**
   * 확대/축소 상태 전파
   * - StreamDetail 컴포넌트에게 "채팅이 확대되었음"을 알려 방송 정보를 숨기게 합니다.
   */
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("stream:chat:expand", { detail: { expanded } })
    );
  }, [expanded]);

  /**
   * 레이아웃 변경 완료 신호 수신
   * - StreamDetail이 숨겨지거나 나타난 후(레이아웃 변경 후) 높이를 다시 계산합니다.
   */
  useEffect(() => {
    const handleLayoutUpdated = () => updateHeight();
    window.addEventListener(
      "stream:chat:layout-updated",
      handleLayoutUpdated as EventListener
    );
    return () =>
      window.removeEventListener(
        "stream:chat:layout-updated",
        handleLayoutUpdated as EventListener
      );
  }, [updateHeight]);

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
        fillParent
        showExpandToggle
        isExpanded={expanded}
        onToggleExpand={() => setExpanded((v) => !v)}
        containerClassName="border-none rounded-none shadow-none" // 모바일은 카드 스타일 제거
      />
    </div>
  );
}
