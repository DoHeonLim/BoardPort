/**
 * File Name : features/chat/hooks/useChatSubscription.ts
 * Description : Supabase 실시간 채팅 구독 훅 (message / message_read / message_deleted)
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
 * 2026.01.18  임도헌   Moved     hooks/chat -> features/chat/hooks
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.02.04  임도헌   Modified  메세지 수신 브로드캐스트에 image 추가
 * 2026.02.22  임도헌   Modified  채팅 읽음 처리 시 전역 알림 벨 카운트 즉시 동기화 추가
 * 2026.02.28  임도헌   Modified  Zustand 기반 전역 상태 감소 로직 적용 (DOM 이벤트 제거)
 * 2026.03.05  임도헌   Modified  주석 최신화
 * 2026.03.07  임도헌   Modified  onMessagesRead에 MessageReadPayload 전체 전달 및 readerId 기반 타입 정합성 보강
 * 2026.03.07  임도헌   Modified  readMessageUpdateAction 결과 타입(MessageReadUpdateResult) 반영
 * 2026.04.01  임도헌   Modified  message_deleted 이벤트 수신 및 로컬 메시지 교체 콜백 추가
 * 2026.04.02  임도헌   Modified  구독 훅 JSDoc 반환 설명 보강
 */
"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import {
  ChatMessage,
  MessageDeletedPayload,
  MessageReadPayload,
} from "@/features/chat/types";
import { readMessageUpdateAction } from "@/features/chat/actions/messages";
import type { AppointmentStatus } from "@/generated/prisma/enums";
import { useNotificationStore } from "@/components/global/providers/NotificationStoreProvider";
import { CHAT_EVENT } from "@/features/chat/constants";

interface UseChatSubscriptionOptions {
  chatRoomId: string; // Supabase 채널 식별용 채팅방 ID
  currentUserId: number; // 현재 로그인한 유저 ID
  onNewMessage: (message: ChatMessage) => void; // 메시지 수신 시 호출되는 콜백
  onMessagesRead: (payload: MessageReadPayload) => void; // 읽음 처리 시 호출되는 콜백
  onMessageDeleted?: (payload: MessageDeletedPayload) => void; // 메시지 삭제 상태 반영 시 호출되는 콜백
  onMessageReaction?: (message: ChatMessage) => void; // 메시지 반응 상태 반영 시 호출되는 콜백
  /**
   * (옵션) 읽음 처리 호출 폭주 방지
   * - 상대방 메시지가 연속으로 들어올 때 매번 readMessageUpdateAction을 호출하면 서버/DB 부담이 커질 수 있음
   * - true일 경우 "동일 tick에서 1회만" 호출되도록 게이트를 설정
   * - 기본값: true
   */
  onAppointmentUpdate?: (id: number, status: AppointmentStatus) => void;
  throttleReadUpdate?: boolean;
}

/**
 * 단일 채팅방에 대한 실시간 구독 훅
 *
 * [기능]
 * 1. `message` 이벤트: 새 메시지 수신 시 콜백을 호출. 내가 보낸 메시지가 아닐 경우 읽음 처리 API를 호출
 * 2. `message_read` 이벤트: 읽음 처리한 사용자(readerId)와 readIds를 함께 전달하여 UI를 갱신
 * 3. 상위 컴포넌트 렌더링 시 콜백 함수 변경으로 인한 재구독을 방지하기 위해 `useRef` 패턴을 적용
 * 4. 읽음 처리가 완료되면 Zustand Store의 `decrement` 액션을 호출하여 전역 알림 뱃지를 갱신
 *
 * @param {UseChatSubscriptionOptions} options
 * @returns {void} 실시간 구독과 해제를 담당하는 effect만 등록
 */
export default function useChatSubscription({
  chatRoomId,
  currentUserId,
  onNewMessage,
  onMessagesRead,
  onMessageDeleted,
  onMessageReaction,
  onAppointmentUpdate,
  throttleReadUpdate = true,
}: UseChatSubscriptionOptions) {
  // 상위 컴포넌트의 리렌더링으로 인해 콜백 참조값이 변경되더라도
  // 불필요한 재구독이 발생하지 않도록 useRef를 사용하여 최신 콜백을 유지
  const onNewMessageRef = useRef(onNewMessage);
  const onMessagesReadRef = useRef(onMessagesRead);
  const onMessageDeletedRef = useRef(onMessageDeleted);
  const onMessageReactionRef = useRef(onMessageReaction);
  const onAppointmentUpdateRef = useRef(onAppointmentUpdate);

  // Zustand 액션 가져오기 (이전의 window.dispatchEvent 대체)
  const decrement = useNotificationStore((state) => state.decrement);

  useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  useEffect(() => {
    onMessagesReadRef.current = onMessagesRead;
  }, [onMessagesRead]);

  useEffect(() => {
    onMessageDeletedRef.current = onMessageDeleted;
  }, [onMessageDeleted]);

  useEffect(() => {
    onMessageReactionRef.current = onMessageReaction;
  }, [onMessageReaction]);

  useEffect(() => {
    onAppointmentUpdateRef.current = onAppointmentUpdate;
  }, [onAppointmentUpdate]);

  // 읽음 처리 중복 호출 방지 플래그
  const readUpdateInFlightRef = useRef(false);

  useEffect(() => {
    const channel = supabase
      .channel(`room-${chatRoomId}`)

      /**
       * 1) 메시지 수신 브로드캐스트 핸들링
       */
      .on("broadcast", { event: CHAT_EVENT.MESSAGE }, async ({ payload }) => {
        const newMessage: ChatMessage = {
          id: payload.id,
          payload: payload.payload,
          image: payload.image,
          imageIsAnimated: payload.imageIsAnimated ?? false,
          deleted_at: payload.deleted_at ? new Date(payload.deleted_at) : null,
          reactions: payload.reactions ?? [],
          type: payload.type,
          appointment: payload.appointment
            ? {
                ...payload.appointment,
                meetDate: new Date(payload.appointment.meetDate),
              }
            : null,
          created_at: new Date(payload.created_at),
          isRead: false,
          productChatRoomId: payload.productChatRoomId,
          user: payload.user,
        };

        const isOwnMessage = payload.user?.id === currentUserId;

        // 메시지를 상위 컴포넌트로 전달 (항상 최신 콜백 사용)
        onNewMessageRef.current(newMessage);

        // 내가 보낸 메시지가 아닐 경우 읽음 처리 요청
        if (!isOwnMessage) {
          try {
            if (!throttleReadUpdate) {
              const res = await readMessageUpdateAction(
                chatRoomId,
                currentUserId
              );
              // 서버에서 읽음 처리된 개수만큼 전역 알림 벨 카운트를 즉시 차감 (Zustand)
              if (res.success && res.readIds.length > 0) {
                decrement(res.readIds.length);
              }
              return;
            }

            // throttle: 이미 호출 중이면 생략함
            if (readUpdateInFlightRef.current) return;
            readUpdateInFlightRef.current = true;

            const res = await readMessageUpdateAction(
              chatRoomId,
              currentUserId
            );
            // 쓰로틀링 모드에서도 동일하게 스토어 상태를 차감함
            if (res.success && res.readIds.length > 0) {
              decrement(res.readIds.length);
            }
          } finally {
            // 다음 메시지 수신 시 다시 호출 가능하도록 락 해제
            readUpdateInFlightRef.current = false;
          }
        }
      })

      /**
       * 2) 읽음 처리 브로드캐스트 수신
       * - 서버에서 payload: { readIds: number[]; readerId: number } 구조로 전송함
       */
      .on("broadcast", { event: CHAT_EVENT.MESSAGE_READ }, ({ payload }) => {
        const readPayload = payload as MessageReadPayload;

        // payload 방어: readIds 배열과 readerId 숫자가 모두 유효할 때만 반영함
        if (
          Array.isArray(readPayload.readIds) &&
          readPayload.readIds.length > 0 &&
          typeof readPayload.readerId === "number"
        ) {
          onMessagesReadRef.current(readPayload);
        }
      })

      /**
       * 3) 메시지 삭제 상태 업데이트 수신
       */
      .on("broadcast", { event: CHAT_EVENT.MESSAGE_DELETED }, ({ payload }) => {
        const deletedPayload = payload as MessageDeletedPayload;

        if (!deletedPayload?.message?.id) return;

        onMessageDeletedRef.current?.({
          ...deletedPayload,
          message: {
            ...deletedPayload.message,
            created_at: new Date(deletedPayload.message.created_at),
            deleted_at: deletedPayload.message.deleted_at
              ? new Date(deletedPayload.message.deleted_at)
              : null,
          },
        });
      })

      /**
       * 4) 메시지 반응 상태 업데이트 수신
       */
      .on("broadcast", { event: CHAT_EVENT.MESSAGE_REACTION }, ({ payload }) => {
        if (!payload?.id) return;

        onMessageReactionRef.current?.({
          ...payload,
          created_at: new Date(payload.created_at),
          deleted_at: payload.deleted_at ? new Date(payload.deleted_at) : null,
          reactions: payload.reactions ?? [],
        });
      })

      /**
       * 5) 약속 상태 업데이트 수신
       */
      .on("broadcast", { event: "appointment_update" }, ({ payload }) => {
        if (payload?.id && payload?.status) {
          onAppointmentUpdateRef.current?.(payload.id, payload.status);
        }
      })
      .subscribe();

    // 언마운트 또는 룸 변경 시 채널 구독 해제
    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatRoomId, currentUserId, throttleReadUpdate, decrement]);
}

