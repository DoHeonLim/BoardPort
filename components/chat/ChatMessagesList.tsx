/**
 * File Name : components/chat/ChatMessageList
 * Description : 채팅 메시지 리스트 + 입력바 UI (무한스크롤 + 실시간 구독 + 전송)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2024.11.01  임도헌   Created   채팅 메시지 컴포넌트 최초 생성
 * 2024.11.08  임도헌   Modified  채팅 메시지 컴포넌트 추가
 * 2024.11.09  임도헌   Modified  Supabase 채널 연결 및 실시간 채팅 기능 추가
 * 2024.11.15  임도헌   Modified  채팅 읽음/안읽음 UI/상태 반영 추가
 * 2024.11.21  임도헌   Modified  ChatroomId → productChatRoomId로 변경
 * 2024.12.07  임도헌   Modified  프로필 이미지 컴포넌트 분리
 * 2024.12.08  임도헌   Modified  시간 표시 컴포넌트 분리
 * 2024.12.12  임도헌   Modified  스타일 변경
 * 2024.12.19  임도헌   Modified  supabase 클라이언트 코드 lib로 이동
 * 2024.12.22  임도헌   Modified  메시지 저장 로직 변경(실시간 통신)
 * 2024.12.30  임도헌   Modified  스크롤 버그 수정
 * 2025.02.02  임도헌   Modified  신속한 교신병 뱃지 체크 추가(checkQuickResponseBadge)
 * 2025.04.18  임도헌   Modified  checkQuickResponseBadge를 server action으로 변경
 * 2025.05.10  임도헌   Modified  UI 개선
 * 2025.07.14  임도헌   Modified  BoardPort 컨셉 최종 디자인 적용
 * 2025.07.17  임도헌   Modified  채팅 무한 스크롤 구현
 * 2025.07.22  임도헌   Modified  ChatInputBar 입력 상태 관리 통합, 스크롤 위치 유지 최적화
 * 2025.07.24  임도헌   Modified  useInfiniteMessages 적용(훅으로 분리)
 * 2025.07.29  임도헌   Modified  낙관적 업데이트(메시지) 제거
 * 2025.12.02  임도헌   Modified  입력창을 fixed 오버레이로 변경, 마지막 메시지 여백 추가
 * 2025.12.07  임도헌   Modified  메시지 전송 성공 시 뱃지 체크하도록 수정
 * 2026.01.03  임도헌   Modified  자동 스크롤 정책 개선(바닥 근처일 때만), unseenCount 버튼 추가,
 *                                전송/로딩 상태 분리(isSending 도입), 강제 점프/무한스크롤 충돌 방지
 */
//  Key Points
//  - 무한 스크롤: 과거 메시지는 상단 sentinel 관측으로 로드하며, prepend 시 scrollHeight diff 기반으로 위치를 유지한다.
//  - 실시간 구독: Supabase broadcast(message/message_read) 수신 → 메시지 append / readIds 반영.
//  - 자동 스크롤 UX:
//    - 사용자가 "바닥 근처"에 있을 때만 자동 스크롤한다.
//    - 사용자가 과거 메시지를 보는 중이면 강제 점프하지 않고, '새 메시지 N개 보기' 버튼으로 유도한다.
//  - 전송 상태 분리:
//    - 과거 메시지 로딩(isFetching)과 메시지 전송(isSending)을 분리하여, 로딩 중에도 전송이 가능하도록 한다.
"use client";

import { useEffect, useRef, useState } from "react";
import ChatMessageBubble from "./ChatMessageBubble";
import ChatInputBar from "./ChatInputBar";
import useChatSubscription from "@/hooks/chat/useChatSubscription";
import { ChatUser, ChatMessage } from "@/types/chat";
import { checkQuickResponseBadgeAction } from "@/app/chats/[id]/actions/badge";
import { sendMessageAction } from "@/app/chats/[id]/actions/messages";
import useInfiniteMessages from "@/hooks/chat/useInfiniteMessages";

interface ChatMessagesListProps {
  initialMessages: ChatMessage[];
  productChatRoomId: string;
  user: ChatUser;
}

/**
 * ChatMessagesList
 * - 채팅방 메시지 리스트 + 입력창 UI
 * - 무한 스크롤, 실시간 메시지 구독, 메시지 전송 기능 포함
 */
export default function ChatMessagesList({
  initialMessages,
  user,
  productChatRoomId,
}: ChatMessagesListProps) {
  /**
   * 1) 무한 스크롤 훅 사용
   * - 이전 메시지 로드, DOM 참조 등 처리
   */
  const {
    messages,
    isFetching,
    setMessages,
    containerRef,
    sentinelRef,
    messagesEndRef,
  } = useInfiniteMessages(initialMessages, productChatRoomId);

  /**
   * 2) 전송 상태는 무한스크롤(fetching)과 분리
   * - 과거 메시지 로딩 중에도 전송은 가능해야 한다.
   */
  const [isSending, setIsSending] = useState(false);

  /**
   * 3) 바닥 근처 여부 판단 기준(px)
   * - 이 값 이내면 사용자가 사실상 바닥에 있다고 보고 자동 스크롤을 허용한다.
   */
  const BOTTOM_THRESHOLD_PX = 80;

  /**
   * 4) 사용자가 현재 바닥 근처인지 추적
   * - 스크롤 이벤트에서 갱신 (ref로 관리해 불필요한 렌더를 줄임)
   */
  const isAtBottomRef = useRef(true);

  /**
   * 5) 사용자가 위에 있을 때 새 메시지가 들어오면 강제 점프 대신
   *    "새 메시지 N개 보기" 버튼을 표시하기 위한 카운터
   */
  const [unseenCount, setUnseenCount] = useState(0);

  /**
   * 6) 스크롤 이벤트로 바닥 근처 여부 갱신
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const distanceToBottom =
        el.scrollHeight - (el.scrollTop + el.clientHeight);
      const atBottom = distanceToBottom <= BOTTOM_THRESHOLD_PX;
      isAtBottomRef.current = atBottom;

      // 바닥으로 복귀하면 unseenCount 리셋
      if (atBottom) setUnseenCount(0);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  /**
   * 7) 바닥 근처일 때만 스크롤 하단 이동
   */
  const scrollToBottomIfAllowed = (behavior: ScrollBehavior) => {
    if (!isAtBottomRef.current) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior });
    });
  };

  /**
   * 8) Supabase 실시간 구독
   * - 새 메시지: append + (바닥 근처면) 자동 스크롤
   * - 읽음 처리: readIds 반영하여 isRead 갱신
   */
  useChatSubscription({
    chatRoomId: productChatRoomId,
    currentUserId: user.id,
    throttleReadUpdate: true,

    onNewMessage: (newMessage) => {
      setMessages((prev) => [...prev, newMessage]);

      const isOwn = newMessage.user.id === user.id;

      if (isAtBottomRef.current) {
        // 내 메시지는 즉시(auto), 상대 메시지는 부드럽게(smooth)
        scrollToBottomIfAllowed(isOwn ? "auto" : "smooth");
      } else {
        // 사용자가 위에 있으면 강제 점프 금지 → 카운트만 증가
        setUnseenCount((c) => c + 1);
      }
    },

    onMessagesRead: (readIds) => {
      setMessages((prev) =>
        prev.map((msg) =>
          readIds.includes(msg.id) ? { ...msg, isRead: true } : msg
        )
      );
    },
  });

  /**
   * 9) 최초 진입 시: 무조건 하단으로 이동
   * - auto로 "즉시" 이동(초기 UX)
   */
  const hasInitialScrolledRef = useRef(false);
  useEffect(() => {
    if (hasInitialScrolledRef.current) return;
    hasInitialScrolledRef.current = true;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      setUnseenCount(0);
    });
  }, [messagesEndRef]);

  /**
   * 10) 메시지 전송
   * - 전송 상태(isSending)만 입력바에 전달
   * - 전송 성공 시: 뱃지 체크(비동기 fire-and-forget)
   * - 바닥 근처인 경우 즉시 스크롤 예약(실시간 echo 지연 대비)
   */
  const onSubmit = async (text: string) => {
    if (isSending) return;

    setIsSending(true);
    try {
      await sendMessageAction(productChatRoomId, text);

      // 성공 시 뱃지 체크 (fire-and-forget)
      void checkQuickResponseBadgeAction(user.id);

      // 바닥 근처면 내려주기(선택)
      scrollToBottomIfAllowed("smooth");
    } catch (err) {
      // 여기서 에러를 삼키면 ChatInputBar가 복원 못 함 → 반드시 throw
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 min-h-0">
      {/* 메시지 스크롤 영역 */}
      <div
        ref={containerRef}
        className="
          flex-1 min-h-0 overflow-y-auto
          px-3 pt-2 pb-20
          space-y-1.5
          sm:px-4 sm:pb-24 sm:space-y-2
          scrollbar
        "
      >
        <div ref={sentinelRef} />

        {isFetching && (
          <div className="text-center text-sm text-neutral-500">
            과거 메시지 불러오는 중...
          </div>
        )}

        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            isOwnMessage={message.user.id === user.id}
            showAvatar
          />
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* 새 메시지 안내(선택) */}
      {unseenCount > 0 && (
        <button
          type="button"
          onClick={() => {
            requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
              setUnseenCount(0);
            });
          }}
          className="
            absolute left-1/2 -translate-x-1/2
            bottom-24 sm:bottom-28
            z-20
            rounded-full
            bg-neutral-900/80 dark:bg-neutral-950/80
            border border-white/10
            px-3 py-1.5
            text-sm text-white
            backdrop-blur-md shadow-lg
          "
        >
          새 메시지 {unseenCount}개 보기
        </button>
      )}

      {/* 하단 입력바: 반투명 fixed 오버레이 */}
      <div
        className="
          pointer-events-none
          fixed inset-x-0 bottom-0
          z-30
          flex justify-center
          pb-3 sm:pb-4
        "
      >
        <div className="pointer-events-auto w-full max-w-2xl px-3 sm:px-4">
          <div className="rounded-2xl mx-2 border border-white/10 bg-neutral-900/75 dark:bg-neutral-950/75 backdrop-blur-md shadow-lg">
            <ChatInputBar
              isSubmitting={isSending}
              onSubmit={onSubmit}
              autoFocus
            />
          </div>
        </div>
      </div>
    </div>
  );
}
