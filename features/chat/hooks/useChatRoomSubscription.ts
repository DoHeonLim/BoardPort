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
 */

"use client";

import { useEffect, useState } from "react";
import { ChatMessage, ChatRoom } from "@/features/chat/types";
import { subscribeToRoomUpdates } from "@/features/chat/utils/realtime";

/**
 * 채팅방 목록 페이지용 실시간 구독 훅
 *
 * [기능]
 * 1. 초기 채팅방 목록(SSR 데이터)을 상태로 관리합니다.
 * 2. `subscribeToRoomUpdates` 유틸을 사용하여 모든 채팅방의 이벤트를 구독합니다.
 * 3. 새 메시지 수신 시 해당 방의 `lastMessage`와 `unreadCount`를 갱신합니다.
 * 4. 읽음 이벤트 수신 시 해당 방의 `unreadCount`를 0으로 초기화합니다.
 *
 * @param {number} userId - 현재 사용자 ID
 * @param {ChatRoom[]} initialRooms - 초기 채팅방 목록
 */
export default function useChatRoomSubscription(
  userId: number,
  initialRooms: ChatRoom[]
) {
  const [rooms, setRooms] = useState<ChatRoom[]>(initialRooms);

  // 서버에서 주입한 unreadCount를 기반으로 초기 상태 구성
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>(
    () => {
      const counts: Record<string, number> = {};
      for (const room of initialRooms) {
        counts[room.id] = room.unreadCount ?? 0;
      }
      return counts;
    }
  );

  // 초기값 변경 시 동기화
  useEffect(() => {
    setRooms(initialRooms);
    setUnreadCounts(() => {
      const counts: Record<string, number> = {};
      for (const room of initialRooms) {
        counts[room.id] = room.unreadCount ?? 0;
      }
      return counts;
    });
  }, [initialRooms]);

  /**
   * Supabase 실시간 채널 구독 설정
   */
  useEffect(() => {
    const unsubscribe = subscribeToRoomUpdates({
      userId,
      roomIds: initialRooms.map((room) => room.id),

      // 메시지 수신: 마지막 메시지 갱신 및 카운트 증가
      onMessage: (message: ChatMessage) => {
        // lastMessage 갱신
        setRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.id === message.productChatRoomId
              ? { ...room, lastMessage: message }
              : room
          )
        );

        // unread count 증가
        setUnreadCounts((prev) => ({
          ...prev,
          [message.productChatRoomId]:
            (prev[message.productChatRoomId] || 0) + 1,
        }));
      },

      // 읽음 처리: 카운트 초기화
      onMessageRead: (roomId: string) => {
        setUnreadCounts((prev) => ({
          ...prev,
          [roomId]: 0,
        }));
      },
    });

    // 언마운트 시 구독 해제
    return () => unsubscribe();
  }, [initialRooms, userId]);

  return {
    rooms, // lastMessage가 최신화된 채팅방 목록
    unreadCounts, // 채팅방별 안읽은 메시지 수
  };
}
