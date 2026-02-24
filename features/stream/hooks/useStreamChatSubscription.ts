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
 * 2026.01.28  임도헌   Modified  주석 및 로직 설명 보강
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { StreamChatMessage } from "@/features/chat/types";

interface Props {
  streamChatRoomId: number;
  userId: number;
  onReceive: (message: StreamChatMessage) => void;
  eventName?: string; // 기본 "message"
  channelName?: string; // 기본 `room-${id}`
  ignoreSelf?: boolean; // 기본 true → 낙관X 플로우에서는 false로 설정
}

interface BroadcastEnvelope<T> {
  event: string;
  payload: T;
}

/**
 * 스트리밍 채팅방 실시간 구독 훅
 *
 * [기능]
 * 1. Supabase Realtime 채널을 구독하고 메시지를 수신
 * 2. 페이지 가시성(`visibilityState`)을 감지하여 백그라운드에서는 처리를 일시 중단
 * 3. 메시지 ID를 기반으로 중복 수신을 방지
 * 4. `ignoreSelf` 옵션으로 내가 보낸 메시지를 무시할지 결정
 *
 * @returns {RealtimeChannel | null} 생성된 채널 인스턴스 (전송용으로 재사용 가능)
 */
export default function useStreamChatSubscription({
  streamChatRoomId,
  userId,
  onReceive,
  eventName = "message",
  channelName,
  ignoreSelf = true,
}: Props) {
  const [channelState, setChannelState] = useState<RealtimeChannel | null>(
    null
  );

  const onReceiveRef = useRef(onReceive);
  useEffect(() => {
    onReceiveRef.current = onReceive;
  }, [onReceive]);

  const seenIdsRef = useRef<Set<string | number>>(new Set());
  const pausedRef = useRef<boolean>(false);

  useEffect(() => {
    const name = channelName ?? `room-${streamChatRoomId}`;
    const channel: RealtimeChannel = supabase.channel(name);
    setChannelState(channel);

    // 가시성 변화 감지
    const onVisibility = () => {
      pausedRef.current = document.visibilityState === "hidden";
    };
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);

    const handler = (env: BroadcastEnvelope<StreamChatMessage>) => {
      if (pausedRef.current) return;

      const msg = env?.payload;
      if (!msg || typeof msg !== "object") return;

      // 중복 수신 방지
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
    };
  }, [streamChatRoomId, userId, eventName, channelName, ignoreSelf]);

  return channelState;
}
