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
 * 2026.04.03  임도헌   Modified  message_deleted 이벤트 구독과 삭제 콜백 지원 추가
 * 2026.04.03  임도헌   Modified  삭제 이벤트 payload에 deleted_at을 포함해 placeholder 동기화를 지원
 * 2026.04.03  임도헌   Modified  고정 공지 변경 이벤트 구독과 콜백 지원 추가
 * 2026.04.07  임도헌   Modified  방송 제목/설명 변경 이벤트 구독과 콜백 지원 추가
 * 2026.04.10  임도헌   Modified  상위 클라이언트 경계 아래에서만 쓰도록 use client 중복 선언을 제거해 직렬화 경고를 완화
 * 2026.08.21  임도헌   Modified  방송 채팅 topic 분리와 JWT 인증 private 구독 적용
 * 2026.08.21  임도헌   Modified  재연결·탭 복귀 시 상위 DB 재조회 콜백 호출
 * 2026.08.22  임도헌   Modified  수신 전용 경계에 맞춰 불필요한 채널 state·반환 제거
 * 2026.08.28  임도헌   Modified  방송 채팅 탭 복귀 재동기화 함수 JSDoc 보강
 */

import { useEffect, useRef } from "react";
import { subscribePrivateRealtimeChannel, supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { StreamChatMessage } from "@/features/chat/types";
import type { StreamMetaUpdatePayload } from "@/features/stream/types";
import { streamChatRealtimeTopic } from "@/features/realtime/topics";

interface Props {
  streamChatRoomId: number;
  userId: number;
  onReceive: (message: StreamChatMessage) => void;
  onDelete?: (payload: { messageId: number; deleted_at: Date }) => void;
  onPinnedNoticeUpdate?: (payload: { notice: string | null }) => void;
  onStreamMetaUpdate?: (payload: StreamMetaUpdatePayload) => void;
  onResync?: () => void;
  eventName?: string; // 기본 "message"
  ignoreSelf?: boolean; // 기본 true → 낙관X 플로우에서는 false로 설정
}

interface BroadcastEnvelope<T> {
  event: string;
  payload: T;
}

interface DeleteEnvelope {
  messageId: number;
  deleted_at: string;
}

interface PinnedNoticeEnvelope {
  notice: string | null;
}

interface StreamMetaEnvelope {
  title: string;
  description: string | null;
}

/**
 * 스트리밍 채팅방 실시간 구독 훅
 *
 * [기능]
 * 1. Supabase Realtime 채널을 구독하고 메시지를 수신
 * 2. 메시지 ID를 기반으로 중복 수신을 방지
 * 3. `ignoreSelf` 옵션으로 내가 보낸 메시지를 무시할지 결정
 * 4. 메시지 삭제, 상단 고정 공지, 방송 메타(title/description) 변경 이벤트도 함께 구독
 */
export default function useStreamChatSubscription({
  streamChatRoomId,
  userId,
  onReceive,
  onDelete,
  onPinnedNoticeUpdate,
  onStreamMetaUpdate,
  onResync,
  eventName = "message",
  ignoreSelf = true,
}: Props) {
  const onReceiveRef = useRef(onReceive);
  useEffect(() => {
    onReceiveRef.current = onReceive;
  }, [onReceive]);

  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  const onPinnedNoticeUpdateRef = useRef(onPinnedNoticeUpdate);
  useEffect(() => {
    onPinnedNoticeUpdateRef.current = onPinnedNoticeUpdate;
  }, [onPinnedNoticeUpdate]);

  const onStreamMetaUpdateRef = useRef(onStreamMetaUpdate);
  useEffect(() => {
    onStreamMetaUpdateRef.current = onStreamMetaUpdate;
  }, [onStreamMetaUpdate]);

  const onResyncRef = useRef(onResync);
  useEffect(() => {
    onResyncRef.current = onResync;
  }, [onResync]);

  const seenIdsRef = useRef<Set<string | number>>(new Set());

  useEffect(() => {
    const authorizationController = new AbortController();
    let hasSubscribed = false;
    const channel: RealtimeChannel = supabase.channel(
      streamChatRealtimeTopic(streamChatRoomId),
      {
        config: { private: true },
      }
    );

    const handler = (env: BroadcastEnvelope<StreamChatMessage>) => {
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

    const deletedHandler = (env: BroadcastEnvelope<DeleteEnvelope>) => {
      const messageId = env?.payload?.messageId;
      const deleted_at = env?.payload?.deleted_at;
      if (typeof messageId !== "number" || typeof deleted_at !== "string")
        return;

      onDeleteRef.current?.({
        messageId,
        deleted_at: new Date(deleted_at),
      });
    };

    const pinnedNoticeHandler = (
      env: BroadcastEnvelope<PinnedNoticeEnvelope>
    ) => {
      const notice = env?.payload?.notice;
      if (notice !== null && typeof notice !== "string") return;

      onPinnedNoticeUpdateRef.current?.({
        notice: notice ?? null,
      });
    };

    const streamMetaHandler = (env: BroadcastEnvelope<StreamMetaEnvelope>) => {
      const title = env?.payload?.title;
      const description = env?.payload?.description;
      if (typeof title !== "string") return;
      if (description !== null && typeof description !== "string") return;

      onStreamMetaUpdateRef.current?.({
        title,
        description: description ?? null,
      });
    };

    channel.on("broadcast", { event: eventName }, handler);
    channel.on("broadcast", { event: "message_deleted" }, deletedHandler);
    channel.on(
      "broadcast",
      { event: "pinned_notice_updated" },
      pinnedNoticeHandler
    );
    channel.on(
      "broadcast",
      { event: "stream_meta_updated" },
      streamMetaHandler
    );
    void subscribePrivateRealtimeChannel(
      channel,
      authorizationController.signal,
      (status) => {
        if (status !== "SUBSCRIBED") return;
        if (hasSubscribed) onResyncRef.current?.();
        hasSubscribed = true;
      }
    );
    /** 탭이 다시 보이면 구독 중 놓친 방송 채팅 상태를 상위에서 재조회한다. */
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") onResyncRef.current?.();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      authorizationController.abort();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      try {
        channel.unsubscribe();
      } catch {}
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [streamChatRoomId, userId, eventName, ignoreSelf]);
}
