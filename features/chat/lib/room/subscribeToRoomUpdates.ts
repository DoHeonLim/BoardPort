/**
 * File Name : features/chat/lib/room/subscribeToRoomUpdates.ts
 * Description : Supabase 채팅방 실시간 구독 로직
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.15  임도헌   Created   Supabase 구독 로직 분리
 * 2025.07.21  임도헌   Modified  payload 타입 적용 및 코드 리팩토링
 * 2025.11.21  임도헌   Modified  message_read 콜백을 roomId 기반으로 단순화
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 */

import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/types/chat";

// 구독 옵션 정의
interface SubscribeOptions {
  userId: number; // 현재 로그인된 유저 ID
  roomIds: string[]; // 구독할 채팅방 ID 목록
  onMessage: (payload: ChatMessage) => void; // 새 메시지 수신 콜백
  onMessageRead: (roomId: string) => void; // 읽음 처리 수신 콜백
}

/**
 * subscribeToRoomUpdates
 * - 여러 채팅방(roomIds)에 대해 Supabase 실시간 구독 설정
 * - 각 채널에서 다음 이벤트를 수신함:
 *   - "message": 새 메시지 수신
 *   - "message_read": 메시지 읽음 처리 (roomId 단위)
 * - 현재 로그인 유저가 보낸 메시지는 필터링하여 제외
 *
 * @returns () => void - 언마운트 시 구독 해제 함수 반환
 */
export function subscribeToRoomUpdates({
  userId,
  roomIds,
  onMessage,
  onMessageRead,
}: SubscribeOptions) {
  // 각 채팅방에 대해 Supabase 채널 구독 설정
  const channels = roomIds.map((roomId) => {
    const channel = supabase.channel(`room-${roomId}`);

    // 새 메시지 수신
    channel.on("broadcast", { event: "message" }, ({ payload }) => {
      if (payload.user.id === userId) return; // 내가 보낸 메시지는 무시
      onMessage(payload as ChatMessage);
    });

    // 메시지 읽음 수신
    // payload 내용에는 관심 없고, "이 채널(roomId)의 메시지가 읽혔다" 정도만 알면 됨
    channel.on("broadcast", { event: "message_read" }, () => {
      onMessageRead(roomId);
    });

    // 실시간 구독 활성화
    channel.subscribe();

    return channel;
  });

  // 컴포넌트 언마운트 시 모든 채널 구독 해제
  return () => {
    channels.forEach((channel) => channel.unsubscribe());
  };
}
