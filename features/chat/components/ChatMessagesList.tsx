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
import { sendMessageAction } from "@/features/chat/actions/messages";
import { checkQuickResponseBadgeAction } from "@/features/chat/actions/badge";
import { proposeAppointmentAction } from "@/features/chat/actions/appointment";
import type { ChatUser, ChatMessage } from "@/features/chat/types";
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
  initialMessages: ChatMessage[];
  productChatRoomId: string;
  user: ChatUser;
  isCounterpartyLeft?: boolean;
}

/**
 * 채팅방 메시지 리스트 및 입력창 컴포넌트
 *
 * [기능]
 * 1. 무한 스크롤 (`useInfiniteMessages`): 스크롤 상단 도달 시 과거 메시지 로드
 * 2. 실시간 구독 (`useChatSubscription`): 새 메시지 수신, 읽음 처리, 약속 상태 변경 반영
 * 3. 메시지 전송 (`sendMessageAction`): 텍스트/이미지 전송 및 뱃지 조건 체크
 * 4. 약속 제안 (`proposeAppointmentAction`): 모달을 통해 약속 잡기 기능 제공
 * 5. 타입별 렌더링: 일반 텍스트, 이미지, 약속 카드, 시스템 메시지 분기 처리
 */
export default function ChatMessagesList({
  initialMessages,
  user,
  productChatRoomId,
  isCounterpartyLeft = false,
}: ChatMessagesListProps) {
  const {
    messages,
    isFetching,
    setMessages,
    containerRef,
    sentinelRef,
    messagesEndRef,
  } = useInfiniteMessages(initialMessages, productChatRoomId);

  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [reportMessageId, setReportMessageId] = useState<number | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const isAtBottomRef = useRef(true);
  const lastMessageIdRef = useRef<number | null>(null);
  const BOTTOM_THRESHOLD_PX = 100;

  /**
   * 약속 제안 핸들러
   * - ScheduleModal에서 날짜와 장소를 받아 서버 액션 호출
   * - 성공 시 로컬 메시지 리스트에 즉시 추가
   */
  const handleProposeAppointment = async (
    date: Date,
    location: LocationData
  ) => {
    try {
      const res = await proposeAppointmentAction(productChatRoomId, {
        meetDate: date,
        location,
      });

      if (res.success) {
        if (res.data) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === res.data!.id)) return prev;
            return [...prev, res.data!];
          });
          isAtBottomRef.current = true;
        }
      } else {
        toast.error(res.error || "약속 제안 실패");
      }
    } catch (e) {
      console.error(e);
      toast.error("오류가 발생했습니다.");
    }
  };

  /**
   * 스크롤 이벤트로 바닥 근처 여부 갱신
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
    // 초기 로드 시 한 번 실행
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  /**
   * 바닥 근처일 때만 스크롤 하단 이동
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
              top: containerRef.current.scrollHeight, // 스크롤 높이 전체 (맨 아래)
              behavior: isOwn ? "auto" : "smooth",
            });
          }
          setUnseenCount(0);
        }, 100);
      }
    }
  }, [containerRef, messages, user.id]);

  /**
   * Supabase 실시간 구독
   * - 새 메시지: append + (바닥 근처면) 자동 스크롤
   * - 읽음 처리: readIds 반영하여 isRead 갱신
   * - 약속 상태
   */
  useChatSubscription({
    chatRoomId: productChatRoomId,
    currentUserId: user.id,
    throttleReadUpdate: true,

    onNewMessage: (newMessage) => {
      // 브로드캐스트된 메시지 수신 시 로컬 낙관적 메시지와 중복되지 않도록 방어
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });

      // 바닥에 있지 않은데 상대방 메시지가 온 경우에만 뱃지 증가
      const isOwn = newMessage.user.id === user.id;
      if (!isOwn && !isAtBottomRef.current) {
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
    // 약속 상태 변경 수신 (수락/거절/취소)
    onAppointmentUpdate: (appointmentId, status) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.appointment?.id === appointmentId) {
            return {
              ...msg,
              appointment: { ...msg.appointment, status },
            };
          }
          return msg;
        })
      );

      // 약속이 수락되면 헤더의 상품 상태(예약중)를 최신화하기 위해 화면 새로고침
      if (status === "ACCEPTED") {
        router.refresh();
      }
    },
  });

  /**
   * 10) 최초 진입 시: 무조건 하단으로 이동
   * - auto로 "즉시" 이동(초기 UX)
   */
  const hasInitialScrolledRef = useRef(false);
  useEffect(() => {
    if (hasInitialScrolledRef.current) return;
    hasInitialScrolledRef.current = true;

    setTimeout(() => {
      // 초기 로드 시에도 컨테이너 스크롤 사용
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: "auto",
        });
      }
      setUnseenCount(0);
      if (initialMessages.length > 0) {
        lastMessageIdRef.current =
          initialMessages[initialMessages.length - 1].id;
      }
    }, 100);
  }, [containerRef, initialMessages]);

  /**
   * 11) 메시지 전송
   * - 서버 액션 호출 후, 반환된 메시지 객체를 즉시 리스트에 추가하여
   *   소켓 왕복 딜레이(Round-trip delay)를 제거하고 체감 속도를 향상시킴
   * - 전송 성공 시: 뱃지 체크(비동기 fire-and-forget)
   * - 바닥 근처인 경우 즉시 스크롤 예약(실시간 echo 지연 대비)
   */
  const onSubmit = async (text?: string | null, imageUrl?: string | null) => {
    if (isSending) return;

    setIsSending(true);
    try {
      const res = await sendMessageAction(productChatRoomId, text, imageUrl);
      // 전송 성공 시 즉시 UI 업데이트 (소켓 수신 대기 X)
      if (res?.success && res.data?.message) {
        const sentMessage = res.data.message;

        // 소켓보다 먼저 UI에 반영
        setMessages((prev) => {
          // 중복 방지
          if (prev.some((m) => m.id === sentMessage.id)) return prev;
          return [...prev, sentMessage];
        });

        // 내가 쓴 글이므로 즉시 바닥 스크롤
        isAtBottomRef.current = true;
      }
      // 성공 시 뱃지 체크
      void checkQuickResponseBadgeAction(user.id);
    } catch (err) {
      throw err;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 h-full min-h-0">
      {/* 메시지 스크롤 영역 */}
      <div
        ref={containerRef}
        className="
          flex-1 min-h-0 overflow-y-auto
          px-3 pt-4 pb-4 space-y-2
          scrollbar
        "
      >
        <div ref={sentinelRef} />

        {isFetching && (
          <div className="text-center text-sm text-neutral-500">
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
          className="
            absolute left-1/2 -translate-x-1/2
            bottom-24 z-20 rounded-full
            bg-neutral-900/80 dark:bg-neutral-950/80 border border-white/10
            px-3 py-1.5 text-sm text-white backdrop-blur-md shadow-lg
          "
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
