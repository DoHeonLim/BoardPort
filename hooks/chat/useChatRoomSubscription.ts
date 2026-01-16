/**
 * File Name : hooks/chat/useChatRoomSubscription.ts
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
 */

"use client";

import { useEffect, useState } from "react";
import { ChatMessage, ChatRoom } from "@/types/chat";
import { subscribeToRoomUpdates } from "@/lib/chat/room/subscribeToRoomUpdates";

/**
 * useChatRoomSubscription
 * - 서버에서 전달된 initialRooms(rooms + unreadCount)를 상태로 관리
 * - Supabase 실시간 채널을 통해 각 채팅방의 메시지/읽음 이벤트를 구독
 * - 새로운 메시지:
 *   - 해당 채팅방의 lastMessage 갱신
 *   - 해당 방 unreadCount + 1
 * - 읽음 이벤트:
 *   - 해당 방 unreadCount = 0
 *
 * @param userId       현재 로그인된 사용자 ID
 * @param initialRooms 서버에서 조회한 채팅방 목록 (unreadCount 포함)
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

  // initialRooms 변경 시 rooms / unreadCounts도 동기화
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

      // 메시지 수신 시 콜백
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

      // 메시지 읽음 수신 시 콜백
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
