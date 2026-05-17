/**
 * File Name : features/chat/components/ChatRoomsRealtimeBridge.tsx
 * Description : 채팅방 목록/미읽음 수를 사용자 단위 Realtime 채널 1개로 재동기화하는 브리지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.17  임도헌   Created   TabBar와 채팅 목록의 user chat-room 채널 중복 구독 제거
 */
"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { CHAT_EVENT } from "@/features/chat/constants";

interface ChatRoomsRealtimeBridgeProps {
  userId: number;
}

/**
 * 채팅방 요약 Realtime 브리지
 *
 * - 앱 탭 영역에서 사용자 단위 `rooms_refresh` 채널을 한 번만 구독
 * - 이벤트 수신 시 채팅 목록과 하단 탭바 미읽음 수 query를 함께 무효화
 * - `pagehide`/hidden 상태에서는 채널을 정리하고, 복귀 시 서버 상태를 재검증
 *
 * @param {ChatRoomsRealtimeBridgeProps} props
 * @returns {null} 렌더링 없이 query invalidation만 수행
 */
export default function ChatRoomsRealtimeBridge({
  userId,
}: ChatRoomsRealtimeBridgeProps) {
  const queryClient = useQueryClient();

  useEffect(() => {
    let activeChannel: ReturnType<typeof supabase.channel> | null = null;
    const listQueryKey = queryKeys.chats.list(userId);
    const unreadQueryKey = queryKeys.chats.unreadCount(userId);

    const refreshChatSummaries = () => {
      void queryClient.invalidateQueries({ queryKey: listQueryKey });
      void queryClient.invalidateQueries({ queryKey: unreadQueryKey });
    };

    const subscribe = () => {
      if (activeChannel) return;

      activeChannel = supabase
        .channel(`user-${userId}-chat-rooms`)
        .on("broadcast", { event: CHAT_EVENT.ROOMS_REFRESH }, refreshChatSummaries)
        .subscribe();
    };

    const unsubscribe = () => {
      if (!activeChannel) return;

      void supabase.removeChannel(activeChannel);
      activeChannel = null;
    };

    const handlePageHide = () => {
      unsubscribe();
    };

    const handlePageShow = () => {
      subscribe();
      refreshChatSummaries();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        unsubscribe();
        return;
      }

      subscribe();
      refreshChatSummaries();
    };

    subscribe();
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      unsubscribe();
    };
  }, [queryClient, userId]);

  return null;
}
