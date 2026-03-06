/**
 * File Name : features/chat/hooks/useChatRoomSubscription.ts
 * Description : Supabase 채팅방 실시간 구독 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.16  임도헌   Created   실시간 처리 로직 훅으로 분리
 * 2025.07.16  임도헌   Modified  Supabase 채팅방 실시간 구독 로직 분리
 * 2025.07.22  임도헌   Modified  단계별 주석 추가 및 코드 흐름 설명 강화
 * 2025.11.21  임도헌   Modified  unreadCount 서버 계산 기반으로 초기화
 * 2026.01.16  임도헌   Moved     hooks -> hooks/chat
 * 2026.01.18  임도헌   Moved     hooks/chat -> features/chat/hooks
 * 2026.01.22  임도헌   Modified  Utils 경로 수정 (subscribeToRoomUpdates)
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.03.03  임도헌   Modified  useState 기반 상태 제거 및 useSuspenseQuery / setQueryData 연동으로 구조 전면 개편
 * 2026.03.03  임도헌   Modified  getChatRoomsAction 서버 액션 호출로 변경 (Service 직접 호출 차단)
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.07  임도헌   Modified  message_read readerId 기준으로 unreadCount 초기화 조건 보강
 */

"use client";

import { useEffect } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { subscribeToRoomUpdates } from "@/features/chat/utils/realtime";
import { getChatRoomsAction } from "@/features/chat/actions/room";
import type { ChatMessage, ChatRoom } from "@/features/chat/types";

/**
 * 채팅방 목록 페이지용 실시간 구독 훅
 *
 * [기능 및 동작 원리]
 * 1. `useSuspenseQuery`를 활용하여 하이드레이션된 채팅방 목록을 선언적으로 가져옴
 * 2. `subscribeToRoomUpdates`를 통해 각 채팅방의 웹소켓 이벤트를 구독
 * 3. 메시지 수신(`message`) 및 읽음 처리(`message_read`) 발생 시 `queryClient.setQueryData`를 사용하여 전역 캐시를 즉각적으로 갱신
 * 4. 읽음 이벤트는 `readerId === 현재 사용자`일 때만 unreadCount를 0으로 반영하여 상대방의 읽음 상태와 혼동되지 않도록 처리
 * 5. 로컬 상태(`useState`)를 완전히 제거하고 단일 진실 공급원(SSOT)을 TanStack Query Cache로 일원화
 *
 * @param {number} userId - 현재 접속 중인 사용자 ID
 * @returns 최신화된 채팅방 목록 배열
 */
export default function useChatRoomSubscription(userId: number) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.chats.list(userId);

  // 1. 서버 캐시 연동 (Suspense 지원)
  const { data: rooms } = useSuspenseQuery({
    queryKey,
    queryFn: () => getChatRoomsAction(),
    staleTime: 60 * 1000,
  });

  // 배열이 변경될 때마다 재구독되는 현상을 방지하기 위해 ID 목록을 직렬화하여 의존성으로 사용
  const roomIdsString = rooms.map((r) => r.id).join(",");

  useEffect(() => {
    if (!roomIdsString) return;

    const roomIds = roomIdsString.split(",");

    const unsubscribe = subscribeToRoomUpdates({
      userId,
      roomIds,
      // 2. 메시지 수신 시 캐시 직접 조작
      onMessage: (message: ChatMessage) => {
        queryClient.setQueryData(
          queryKey,
          (oldRooms: ChatRoom[] | undefined) => {
            if (!oldRooms) return oldRooms;

            const newRooms = oldRooms.map((room) => {
              if (room.id === message.productChatRoomId) {
                return {
                  ...room,
                  lastMessage: message,
                  unreadCount: (room.unreadCount ?? 0) + 1,
                };
              }
              return room;
            });

            // 가장 최근 대화가 상단으로 오도록 정렬을 재수행
            return newRooms.sort((a, b) => {
              const aTime = a.lastMessage?.created_at || a.updated_at;
              const bTime = b.lastMessage?.created_at || b.updated_at;
              return new Date(bTime).getTime() - new Date(aTime).getTime();
            });
          }
        );
      },
      // 3. 메시지 읽음 처리 시 캐시 카운트 초기화
      onMessageRead: ({ roomId, readerId }) => {
        if (readerId !== userId) return;

        queryClient.setQueryData(
          queryKey,
          (oldRooms: ChatRoom[] | undefined) => {
            if (!oldRooms) return oldRooms;
            return oldRooms.map((room) => {
              if (room.id === roomId) {
                return { ...room, unreadCount: 0 };
              }
              return room;
            });
          }
        );
      },
    });

    return () => unsubscribe();
  }, [roomIdsString, userId, queryClient, queryKey]);

  return { rooms };
}
