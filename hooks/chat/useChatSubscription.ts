/**
 * File Name : hooks/chat/useChatSubscription.ts
 * Description : Supabase 실시간 채팅 구독 훅 (message / message_read)
 * Author : 임도헌
 *
 * Key Points
 * - 콜백(onNewMessage/onMessagesRead) identity 변화로 인한 "매 렌더 재구독"을 방지하기 위해 ref 패턴 사용
 * - 상대방 메시지 수신 시 읽음 처리 API를 호출하고, 서버가 브로드캐스트한 readIds를 수신하여 UI를 동기화
 * - 네트워크/탭 전환/빠른 연속 수신 환경에서도 중복 수신/메모리 누수 없이 안정적으로 동작하도록 cleanup 보장
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.16  임도헌   Created   Supabase 실시간 채팅 구독 훅 분리
 * 2025.07.22  임도헌   Modified  단계별 주석 추가 및 코드 흐름 설명 강화
 * 2025.07.29  임도헌   Modified  읽음 처리 이벤트(message_read) 수신 로직 추가
 * 2025.11.21  임도헌   Modified  MessageReadPayload 타입 적용 및 any 제거
 * 2026.01.03  임도헌   Modified  콜백 ref 패턴 도입(재구독 방지), cleanup 안정화, 읽음 처리 호출 폭주 방지(옵션)
 * 2026.01.16  임도헌   Moved     hooks -> hooks/chat
 */

"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { ChatMessage, MessageReadPayload } from "@/types/chat";
import { readMessageUpdateAction } from "@/app/chats/[id]/actions/messages";

interface UseChatSubscriptionOptions {
  chatRoomId: string; // Supabase 채널 식별용 채팅방 ID
  currentUserId: number; // 현재 로그인한 유저 ID
  onNewMessage: (message: ChatMessage) => void; // 메시지 수신 시 호출되는 콜백
  onMessagesRead: (readIds: number[]) => void; // 읽음 처리 시 호출되는 콜백

  /**
   * (옵션) 읽음 처리 호출 폭주 방지
   * - 상대방 메시지가 연속으로 들어올 때 매번 readMessageUpdateAction을 호출하면 서버/DB 부담이 커질 수 있다.
   * - true면 "동일 tick에서 1회만" 호출되도록 간단한 게이트를 걸어준다.
   * - 기본값: true
   */
  throttleReadUpdate?: boolean;
}

/**
 * useChatSubscription
 * - Supabase를 통한 실시간 메시지 수신 및 읽음 처리 이벤트를 구독
 * - 상대방 메시지 수신 시 읽음 처리 API 호출
 * - 읽음 처리 결과를 다시 브로드캐스트로 수신하면 메시지 목록 상태 갱신
 */
export default function useChatSubscription({
  chatRoomId,
  currentUserId,
  onNewMessage,
  onMessagesRead,
  throttleReadUpdate = true,
}: UseChatSubscriptionOptions) {
  /**
   * 콜백 ref
   * - 상위 컴포넌트가 리렌더되면 onNewMessage/onMessagesRead 함수 identity가 바뀔 수 있다.
   * - 이를 deps에 넣으면 매 렌더마다 useEffect가 재실행되어 "구독이 반복 생성"될 수 있음.
   * - ref에 최신 콜백만 주입하고, 구독 effect는 chatRoomId/currentUserId만을 기준으로 1회 유지한다.
   */
  const onNewMessageRef = useRef(onNewMessage);
  const onMessagesReadRef = useRef(onMessagesRead);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    onMessagesReadRef.current = onMessagesRead;
  }, [onMessagesRead]);

  /**
   * 읽음 처리 호출 게이트(옵션)
   * - 연속 수신 시 readMessageUpdateAction이 중복 호출되지 않게 간단히 막는다.
   * - 더 정교하게 하려면 debounce(예: 150ms)로 바꿀 수도 있으나,
   *   여기서는 "동일 렌더 tick에서 1회" 정도로 충분한 경우가 많다.
   */
  const readUpdateInFlightRef = useRef(false);

  useEffect(() => {
    const channel = supabase
      .channel(`room-${chatRoomId}`)

      /**
       * 1) 메시지 수신 브로드캐스트 핸들링
       */
      .on("broadcast", { event: "message" }, async ({ payload }) => {
        // payload 구조가 서버와 동기화되어 있다는 전제(기존 동작 유지)
        const newMessage: ChatMessage = {
          id: payload.id,
          payload: payload.payload,
          created_at: new Date(payload.created_at),
          isRead: false, // 수신 시에는 읽지 않은 상태
          productChatRoomId: payload.productChatRoomId,
          user: {
            id: payload.user.id,
            username: payload.user.username,
            avatar: payload.user.avatar ?? null,
          },
        };

        const isOwnMessage = payload.user?.id === currentUserId;

        // 메시지를 상위 컴포넌트로 전달(항상 최신 ref 콜백 사용)
        onNewMessageRef.current(newMessage);

        // 내가 보낸 메시지가 아니면 읽음 처리 요청
        if (!isOwnMessage) {
          try {
            if (!throttleReadUpdate) {
              await readMessageUpdateAction(chatRoomId, currentUserId);
              return;
            }

            // throttle: 이미 호출 중이면 스킵
            if (readUpdateInFlightRef.current) return;
            readUpdateInFlightRef.current = true;

            await readMessageUpdateAction(chatRoomId, currentUserId);
          } finally {
            // 다음 메시지 수신에서 다시 호출 가능
            readUpdateInFlightRef.current = false;
          }
        }
      })

      /**
       * 2) 읽음 처리 브로드캐스트 수신
       * - 서버에서 payload: { readIds: number[] } 구조로 전송
       */
      .on("broadcast", { event: "message_read" }, ({ payload }) => {
        const { readIds } = payload as MessageReadPayload;

        // payload 방어: readIds가 올바른 배열일 때만 반영
        if (Array.isArray(readIds) && readIds.length > 0) {
          onMessagesReadRef.current(readIds);
        }
      })

      .subscribe();

    // 언마운트/room 변경 시 채널 구독 해제
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, currentUserId, throttleReadUpdate]);
}
