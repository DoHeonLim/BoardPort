/**
 * File Name : features/chat/utils/realtime.ts
 * Description : Supabase 채팅방 실시간 구독 유틸 (Client Side)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.15  임도헌   Created   Supabase 구독 로직 분리
 * 2025.07.21  임도헌   Modified  payload 타입 적용 및 코드 리팩토링
 * 2025.11.21  임도헌   Modified  message_read 콜백을 roomId 기반으로 단순화
 * 2026.01.18  임도헌   Moved     lib/chat -> features/chat/lib
 * 2026.01.22  임도헌   Moved     lib/room/subscribeToRoomUpdates.ts -> utils/realtime.ts
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.02.19  임도헌   Modified  약속/시스템 메시지 타입 수신 대응 설명 추가
 */

import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/features/chat/types";
import { CHAT_EVENT } from "@/features/chat/constants";

interface SubscribeOptions {
  userId: number; // 현재 로그인된 유저 ID
  roomIds: string[]; // 구독할 채팅방 ID 목록
  onMessage: (payload: ChatMessage) => void; // 새 메시지 수신 콜백
  onMessageRead: (roomId: string) => void; // 읽음 처리 수신 콜백
}

/**
 * 여러 채팅방에 대해 실시간 이벤트를 구독
 *
 * [기능]
 * 1. 전달받은 roomIds 각각에 대해 Supabase 채널을 생성하고 구독
 * 2. `message` 이벤트: 내가 보낸 것이 아닌 새 메시지를 수신하면 onMessage 콜백을 실행
 * 3. `message_read` 이벤트: 상대방이 메시지를 읽으면 onMessageRead 콜백을 실행
 * 4. 구독 해제 함수(unsubscribe)를 반환하여 클린업을 지원
 * 5. TEXT, IMAGE 외에도 APPOINTMENT(약속), SYSTEM(알림) 타입의 메시지를 수신할 수 있음.
 * 6. 수신된 payload는 클라이언트 훅(useChatSubscription)에서 Date 객체로 변환됨.
 *
 * @param {SubscribeOptions} options - 구독 설정 (유저 ID, 방 목록, 콜백)
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

    // 1. 새 메시지 수신
    channel.on("broadcast", { event: CHAT_EVENT.MESSAGE }, ({ payload }) => {
      // 내가 보낸 메시지는 이미 로컬(Optimistic)이나 전송 완료 후 처리되므로 무시할 수도 있음
      // 하지만 여기서는 리스트 갱신을 위해 수신하되, 본인 여부는 상위에서 판단하도록 원본 payload 전달
      // (기존 코드 로직 유지: payload.user.id === userId 체크는 훅에서 수행)
      if (payload.user.id === userId) return;

      onMessage(payload as ChatMessage);
    });

    // 2. 메시지 읽음 수신
    channel.on("broadcast", { event: CHAT_EVENT.MESSAGE_READ }, () => {
      // 읽음 처리 이벤트가 발생하면 해당 방의 unreadCount를 0으로 만들기 위해 콜백 호출
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
