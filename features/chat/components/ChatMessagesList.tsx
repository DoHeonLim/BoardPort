/**
 * File Name : features/chat/components/ChatMessagesList.tsx
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
 * 2026.01.17  임도헌   Moved     components/chat -> features/chat/components
 * 2026.01.28  임도헌   Modified  주석 보강 및 컴포넌트 구조 설명 추가
 * 2026.02.04  임도헌   Modified  sendMessageAction의 param에 image 추가
 * 2026.02.04  임도헌   Modified  메시지 수신 시 스크롤 로직을 useEffect로 이동하여 타이밍 문제 해결
 * 2026.02.06  임도헌   Modified  ReportModal 연동 및 메시지 신고 핸들러 연결
 * 2026.02.19  임도헌   Modified  약속 제안(ScheduleModal) 및 상태별 버블(AppointmentBubble) 통합
 * 2026.02.20  임도헌   Modified  약속 수락(ACCEPTED) 시 router.refresh() 호출로 ChatHeader 상태 동기화
 * 2026.02.26  임도헌   Modified  autoFocus 제거, 아이폰 하단 홈과 겹치는 곳 수정
 * 2026.03.01  임도헌   Modified  useInfiniteMessages(TanStack Query) 적용으로 수동 상태 동기화 제거 및 캐시 조작 연동
 * 2026.03.03  임도헌   Modified  메시지 전송 및 약속 제안 로직을 CQRS(Mutation) 패턴으로 훅(Hook) 분리
 * 2026.03.05  임도헌   Modified  주석 최신화
 */
"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import ChatMessageBubble from "@/features/chat/components/ChatMessageBubble";
import ChatInputBar from "@/features/chat/components/ChatInputBar";
import useChatSubscription from "@/features/chat/hooks/useChatSubscription";
import useInfiniteMessages from "@/features/chat/hooks/useInfiniteMessages";
import AppointmentBubble from "@/features/chat/components/AppointmentBubble";
import SystemMessage from "@/features/chat/components/SystemMessage";
import { checkQuickResponseBadgeAction } from "@/features/chat/actions/badge";
import { useSendMessageMutation } from "@/features/chat/hooks/useSendMessageMutation";
import { useProposeAppointmentMutation } from "@/features/chat/hooks/useProposeAppointmentMutation";
import type { ChatUser } from "@/features/chat/types";
import type { LocationData } from "@/features/map/types";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);
const ScheduleModal = dynamic(
  () => import("@/features/chat/components/ScheduleModal"),
  { ssr: false }
);

interface ChatMessagesListProps {
  productChatRoomId: string;
  user: ChatUser;
  isCounterpartyLeft?: boolean;
}

/**
 * 채팅방 메시지 리스트 및 입력창 컴포넌트
 *
 * [상태 주입 및 상호작용 로직]
 * - `useInfiniteMessages` 훅을 활용한 선언적 과거 메시지 무한 스크롤 및 캐시 상태 렌더링
 * - CQRS 패턴(Mutation Hook)을 적용한 메시지 전송 및 약속 제안 상태 제어
 * - Supabase 실시간 웹소켓 이벤트 구독 및 TanStack Query 캐시 직접 조작(Optimistic Update) 적용
 * - 메시지 수신 시 스크롤 위치 기반 자동 스크롤 및 안 읽은 메시지 카운트 제어
 */
export default function ChatMessagesList({
  user,
  productChatRoomId,
  isCounterpartyLeft = false,
}: ChatMessagesListProps) {
  // 선언적 데이터 패칭 (Suspense 보장)
  const {
    messages,
    isFetchingNextPage,
    addMessage,
    updateMessagesRead,
    updateAppointmentStatus,
    containerRef,
    sentinelRef,
    messagesEndRef,
  } = useInfiniteMessages(productChatRoomId);

  // Mutation Hooks 연동
  const { mutateAsync: sendMessage, isPending: isSending } =
    useSendMessageMutation(productChatRoomId);
  const { mutateAsync: proposeAppointment } =
    useProposeAppointmentMutation(productChatRoomId);

  const router = useRouter();
  const [unseenCount, setUnseenCount] = useState(0);
  const [reportMessageId, setReportMessageId] = useState<number | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const isAtBottomRef = useRef(true);
  const lastMessageIdRef = useRef<number | null>(null);
  const BOTTOM_THRESHOLD_PX = 100;

  /**
   * 약속 제안 핸들러
   */
  const handleProposeAppointment = async (
    date: Date,
    location: LocationData
  ) => {
    try {
      const resData = await proposeAppointment({ date, location });
      if (resData) {
        addMessage(resData);
        isAtBottomRef.current = true;
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  /**
   * 스크롤 바닥 여부 감지
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onScroll = () => {
      const distanceToBottom =
        el.scrollHeight - (el.scrollTop + el.clientHeight);
      const atBottom = distanceToBottom <= BOTTOM_THRESHOLD_PX;
      isAtBottomRef.current = atBottom;

      if (atBottom) setUnseenCount(0);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  /**
   * 메시지 추가 시 바닥 근처라면 자동 스크롤
   */
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;

    if (lastMessageIdRef.current !== lastMsg.id) {
      lastMessageIdRef.current = lastMsg.id;
      const isOwn = lastMsg.user.id === user.id;

      if (isOwn || isAtBottomRef.current) {
        setTimeout(() => {
          if (containerRef.current) {
            containerRef.current.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: isOwn ? "auto" : "smooth",
            });
          }
          setUnseenCount(0);
        }, 100);
      }
    }
  }, [containerRef, messages, user.id]);

  /**
   * Supabase 실시간 웹소켓 구독
   */
  useChatSubscription({
    chatRoomId: productChatRoomId,
    currentUserId: user.id,
    throttleReadUpdate: true,
    onNewMessage: (newMessage) => {
      addMessage(newMessage);

      const isOwn = newMessage.user.id === user.id;
      if (!isOwn && !isAtBottomRef.current) {
        setUnseenCount((c) => c + 1);
      }
    },
    onMessagesRead: (readIds) => updateMessagesRead(readIds),
    onAppointmentUpdate: (appointmentId, status) => {
      updateAppointmentStatus(appointmentId, status);
      // 예약 승인 시 헤더 뱃지 갱신을 위해 RSC를 리프레시함
      if (status === "ACCEPTED") router.refresh();
    },
  });

  /**
   * 최초 진입 시 무조건 최하단으로 스크롤 고정
   */
  const hasInitialScrolledRef = useRef(false);
  useEffect(() => {
    if (hasInitialScrolledRef.current) return;
    hasInitialScrolledRef.current = true;

    setTimeout(() => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "auto",
        });
      }
      setUnseenCount(0);
      if (messages.length > 0) {
        lastMessageIdRef.current = messages[messages.length - 1].id;
      }
    }, 100);
  }, [containerRef, messages]);

  /**
   * 메시지 전송 핸들러
   */
  const onSubmit = async (text?: string | null, imageUrl?: string | null) => {
    try {
      const resData = await sendMessage({ text, imageUrl });
      if (resData?.message) {
        addMessage(resData.message);
        isAtBottomRef.current = true;
      }
      // 성공 시 비동기로 뱃지 획득 여부 체크
      void checkQuickResponseBadgeAction(user.id);
    } catch (err: any) {
      if (err.message === "RATE_LIMITED") {
        toast.error("조금 천천히 보내주세요. 🐢");
      }
      throw err; // ChatInputBar에서 catch 하여 입력값을 복구하도록 에러를 전파함
    }
  };

  return (
    <div className="relative flex flex-col flex-1 h-full min-h-0">
      {/* 메시지 스크롤 영역 */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 pt-4 pb-4 space-y-2 scrollbar"
      >
        <div ref={sentinelRef} />

        {isFetchingNextPage && (
          <div className="text-center text-sm text-neutral-500 py-2">
            <span className="inline-block size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin mr-2 align-middle" />
            과거 메시지 불러오는 중...
          </div>
        )}

        {messages.map((message) => {
          if (message.type === "SYSTEM") {
            return (
              <SystemMessage key={message.id} text={message.payload ?? ""} />
            );
          }

          if (message.type === "APPOINTMENT") {
            const isOwn = message.user.id === user.id;
            return (
              <div
                key={message.id}
                className={`flex w-full ${
                  isOwn ? "justify-end" : "justify-start"
                } py-2`}
              >
                <AppointmentBubble
                  message={message}
                  isOwnMessage={isOwn}
                  currentUserId={user.id}
                  isCounterpartyLeft={isCounterpartyLeft}
                />
              </div>
            );
          }

          return (
            <ChatMessageBubble
              key={message.id}
              message={message}
              isOwnMessage={message.user.id === user.id}
              showAvatar
              onReport={(id) => setReportMessageId(id)}
            />
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 안 읽은 새 메시지 안내 버튼 */}
      {unseenCount > 0 && (
        <button
          type="button"
          onClick={() => {
            containerRef.current?.scrollTo({
              top: containerRef.current.scrollHeight,
              behavior: "smooth",
            });
            setUnseenCount(0);
          }}
          className="absolute left-1/2 -translate-x-1/2 bottom-24 z-20 rounded-full bg-neutral-900/80 dark:bg-neutral-950/80 border border-white/10 px-3 py-1.5 text-sm text-white backdrop-blur-md shadow-lg animate-bounce"
        >
          새 메시지 {unseenCount}개 보기
        </button>
      )}

      {/* 하단 입력바 영역 */}
      <div className="shrink-0 w-full flex justify-center px-2 pt-2 bg-transparent z-30 pb-[max(env(safe-area-inset-bottom),1rem)] sm:pb-6">
        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-neutral-900/75 dark:bg-neutral-950/75 backdrop-blur-md shadow-lg">
          <ChatInputBar
            isSubmitting={isSending}
            onSubmit={onSubmit}
            onScheduleOpen={() => setScheduleModalOpen(true)}
            disabled={isCounterpartyLeft}
          />
        </div>
      </div>

      <ReportModal
        isOpen={!!reportMessageId}
        onClose={() => setReportMessageId(null)}
        targetId={reportMessageId ?? 0}
        targetType="PRODUCT_MESSAGE"
      />
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onConfirm={handleProposeAppointment}
      />
    </div>
  );
}
