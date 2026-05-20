/**
 * File Name : features/chat/components/ChatRoomsRealtimeBridge.tsx
 * Description : 채팅방 목록/미읽음 수를 사용자 단위 Realtime 채널 1개로 재동기화하는 브리지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.17  임도헌   Created   TabBar와 채팅 목록의 user chat-room 채널 중복 구독 제거
 * 2026.05.18  임도헌   Modified  탭 밖 채팅 상세까지 포함하도록 앱 전역 브리지 역할로 설명 보강
 * 2026.05.18  임도헌   Modified  초기 렌더 중 Server Action 재호출을 피하도록 마운트 직후 목록 invalidate 제거
 * 2026.05.18  임도헌   Modified  rooms_refresh 수신 시 미읽음 수 query를 비활성 상태까지 재검증하도록 보강
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
 * - 로그인 후 앱 영역에서 사용자 단위 `rooms_refresh` 채널을 한 번만 구독
 * - 이벤트 수신 시 채팅 목록과 TabBar 미읽음 수 query를 함께 재검증
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
      // 목록은 화면에 보일 때만 재조회하고, TabBar 뱃지는 어느 화면에서도 최신화되도록 all refetch
      void queryClient.invalidateQueries({
        queryKey: listQueryKey,
        refetchType: "active",
      });
      void queryClient.refetchQueries({
        queryKey: unreadQueryKey,
        type: "all",
      });
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
