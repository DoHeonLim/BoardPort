/**
 * File Name : features/stream/hooks/useStreamChatSubscription.ts
 * Description : 스트리밍 채팅 Supabase 브로드캐스트 구독 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.31  임도헌   Created   스트리밍 채팅 실시간 수신 훅 구현
 * 2025.08.23  임도헌   Modified  ignoreSelf 옵션 추가(낙관X 플로우 지원), cleanup 강화
 * 2025.09.05  임도헌   Modified  dedup(Set) 및 visibility 숨김 시 일시중단 추가 (시그니처 변화 없음)
 * 2025.09.09  임도헌   Modified  handler payload 타입 명확화(BroadcastEnvelope<StreamChatMessage>)
 * 2025.11.21  임도헌   Modified  채널 인스턴스 반환 추가
 * 2026.01.16  임도헌   Moved     hooks -> hooks/stream
 * 2026.01.18  임도헌   Moved     hooks/stream -> features/stream/hooks
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { StreamChatMessage } from "@/types/chat";

interface Props {
  streamChatRoomId: number;
  userId: number;
  onReceive: (message: StreamChatMessage) => void;
  eventName?: string; // 기본 "message"
  channelName?: string; // 기본 `room-${id}`
  ignoreSelf?: boolean; // 기본 true → 낙관X 플로우에서는 false로 설정
}

// Supabase broadcast 콜백 형태 래퍼
interface BroadcastEnvelope<T> {
  event: string;
  payload: T;
}

export function useStreamChatSubscription({
  streamChatRoomId,
  userId,
  onReceive,
  eventName = "message",
  channelName,
  ignoreSelf = true,
}: Props) {
  // 채널 인스턴스 저장(전송용 재사용)
  const [channelState, setChannelState] = useState<RealtimeChannel | null>(
    null
  );

  const onReceiveRef = useRef(onReceive);
  useEffect(() => {
    onReceiveRef.current = onReceive;
  }, [onReceive]);

  // 같은 메시지 id가 두 번 들어오는 것 방지
  const seenIdsRef = useRef<Set<string | number>>(new Set());
  // 탭/창이 숨겨졌을 때 처리 일시중단
  const pausedRef = useRef<boolean>(false);

  useEffect(() => {
    const name = channelName ?? `room-${streamChatRoomId}`;
    const channel: RealtimeChannel = supabase.channel(name);
    setChannelState(channel); // 외부에 알려줄 값

    // 가시성 변화에 따라 일시중단 플래그 관리
    const onVisibility = () => {
      pausedRef.current = document.visibilityState === "hidden";
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    // payload 타입 명확화
    const handler = (env: BroadcastEnvelope<StreamChatMessage>) => {
      if (pausedRef.current) return;

      const msg = env?.payload;
      if (!msg || typeof msg !== "object") return;

      // dedup — StreamChatMessage.id 기준으로만 중복 수신 차단
      const mid = msg.id;
      if (mid != null) {
        if (seenIdsRef.current.has(mid)) return;
        seenIdsRef.current.add(mid);
      }

      // 내 메시지 무시 옵션
      if (ignoreSelf && msg.userId === userId) return;

      onReceiveRef.current?.(msg);
    };

    channel.on("broadcast", { event: eventName }, handler);
    channel.subscribe();

    return () => {
      try {
        channel.unsubscribe();
      } catch {}
      try {
        supabase.removeChannel(channel);
      } catch {}
      document.removeEventListener("visibilitychange", onVisibility);
      // 필요 시 초기화 원하면 주석 해제:
      // seenIdsRef.current.clear();
    };
  }, [streamChatRoomId, userId, eventName, channelName, ignoreSelf]);

  // 전송 시에도 같은 채널을 재사용할 수 있도록 반환
  return channelState;
}

export default useStreamChatSubscription;
