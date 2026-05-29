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
 * 2026.03.06  임도헌   Modified  채팅방 최초 진입 시 실제 마지막 메시지를 안정적으로 노출하도록 초기 스크롤 기준 조정
 * 2026.03.06  임도헌   Modified  최초 진입 스크롤과 실시간 수신 스크롤 정책을 분리해 과거 메시지 탐색 중 자동 점프를 방지
 * 2026.03.07  임도헌   Modified  useChatSubscription의 읽음 이벤트 payload 구조(readerId 포함)에 맞춰 콜백 시그니처 정합성 보강
 * 2026.03.12  임도헌   Modified  현재 채팅방 내부 검색(하이라이트/이전·다음 점프) 상태를 지원하도록 확장
 * 2026.03.12  임도헌   Modified  검색 매치 강조 배경과 링 대비를 높여 라이트/다크모드 가시성 강화
 * 2026.03.12  임도헌   Modified  검색 결과가 없을 때 과거 메시지를 자동으로 추가 로드해 이전 대화까지 순차 검색 지원
 * 2026.03.12  임도헌   Modified  채팅방 목록 최신 메시지 캐시를 함께 갱신해 전송 직후 목록 정합성 유지
 * 2026.03.12  임도헌   Modified  새 메시지 안내와 입력바 래퍼를 시맨틱 토큰 기반 오버레이 톤으로 통일
 * 2026.03.12  임도헌   Modified  검색 하이라이트와 빈/로딩 상태 문구를 시맨틱 토큰 기준으로 정리
 * 2026.03.14  임도헌   Modified  최초 하단 정렬이 끝난 뒤에만 상단 무한스크롤을 열어 긴 채팅방 진입 시 중간 위치에 멈추는 경쟁 상태를 해소
 * 2026.03.16  임도헌   Modified  시스템 배너와 입력바 가시성 개선을 위한 반투명/블러 제거
 * 2026.03.27  임도헌   Modified  상세 채팅 입력바 셸을 한 단계 조용하게 정리해 배경 일러스트와 경쟁을 완화
 * 2026.03.28  임도헌   Modified  현재 대화 검색을 메시지 표면 하이라이트, 검색 중/결과 없음 피드백, 최신 결과 우선 탐색, 모바일 플로팅 이동 버튼, 순환형 내비게이션 기준으로 전반 정리
 * 2026.04.02  임도헌   Modified  메시지 삭제/반응 액션과 채팅방 목록 마지막 메시지 캐시 동기화 흐름 추가
 * 2026.04.10  임도헌   Modified  채팅 타이포 정책에 맞춰 검색 상태 문구 강조 weight를 500 기준으로 정리
 * 2026.04.21  임도헌   Modified  검색/뷰포트 상태를 전용 훅으로 분리하고 함수 설명 주석을 정리
 * 2026.04.22  임도헌   Modified  메시지 삭제 확인을 브라우저 confirm 대신 공용 ConfirmDialog로 통일
 * 2026.05.18  임도헌   Modified  채팅방 진입 직후 목록/TabBar 미읽음 캐시를 읽음 상태와 즉시 동기화
 * 2026.05.28  임도헌   Modified  입력바와 메시지 리스트 사이의 불필요한 하단 여백 제거
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import ChatMessageBubble from "@/features/chat/components/ChatMessageBubble";
import ChatInputBar from "@/features/chat/components/ChatInputBar";
import ConfirmDialog from "@/components/global/ConfirmDialog";
import useChatSubscription from "@/features/chat/hooks/useChatSubscription";
import useInfiniteMessages from "@/features/chat/hooks/useInfiniteMessages";
import AppointmentBubble from "@/features/chat/components/AppointmentBubble";
import SystemMessage from "@/features/chat/components/SystemMessage";
import { checkQuickResponseBadgeAction } from "@/features/chat/actions/badge";
import { useSendMessageMutation } from "@/features/chat/hooks/useSendMessageMutation";
import { useProposeAppointmentMutation } from "@/features/chat/hooks/useProposeAppointmentMutation";
import {
  deleteMessageAction,
  toggleMessageReactionAction,
} from "@/features/chat/actions/messages";
import type { ChatRoom, ChatUser } from "@/features/chat/types";
import type { LocationData } from "@/features/map/types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { queryKeys } from "@/lib/queryKeys";
import type { ChatMessageReactionKey } from "@/features/chat/constants";
import useChatMessageViewport from "@/features/chat/hooks/useChatMessageViewport";
import useChatSearchNavigator from "@/features/chat/hooks/useChatSearchNavigator";

const ReportModal = dynamic(
  () => import("@/features/report/components/ReportModal"),
  { ssr: false }
);
const ScheduleModal = dynamic(
  () => import("@/features/chat/components/ScheduleModal"),
  { ssr: false }
);

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "알 수 없는 오류가 발생했습니다.";
}

interface ChatMessagesListProps {
  productChatRoomId: string;
  user: ChatUser;
  isCounterpartyLeft?: boolean;
  searchQuery?: string;
  searchNavigation?: { seq: number; direction: "next" | "prev" } | null;
  onSearchMetaChange?: (meta: {
    count: number;
    current: number;
    canGoPrev: boolean;
    canGoNext: boolean;
  }) => void;
}

/**
 * 채팅방 메시지 리스트 및 입력창 컴포넌트
 *
 * [상태 주입 및 상호작용 로직]
 * - `useInfiniteMessages` 훅을 활용한 선언적 과거 메시지 무한 스크롤 및 캐시 상태 렌더링
 * - CQRS 패턴(Mutation Hook)을 적용한 메시지 전송 및 약속 제안 상태 제어
 * - Supabase 실시간 웹소켓 이벤트 구독 및 TanStack Query 캐시 직접 조작(Optimistic Update) 적용
 * - 검색어 기준 하이라이트, 이전/다음 이동, 과거 메시지 순차 검색 지원
 * - 메시지 수신 시 스크롤 위치 기반 자동 스크롤 및 안 읽은 메시지 카운트 제어
 */
export default function ChatMessagesList({
  user,
  productChatRoomId,
  isCounterpartyLeft = false,
  searchQuery = "",
  searchNavigation = null,
  onSearchMetaChange,
}: ChatMessagesListProps) {
  const [isInitialBottomAligned, setIsInitialBottomAligned] = useState(false);

  // 선언적 데이터 패칭 (Suspense 보장)
  const {
    messages,
    isFetchingNextPage,
    hasMore,
    loadMore,
    addMessage,
    replaceMessage,
    updateMessagesRead,
    updateAppointmentStatus,
    containerRef,
    sentinelRef,
    messagesEndRef,
  } = useInfiniteMessages(productChatRoomId, isInitialBottomAligned);

  // Mutation Hooks 연동
  const { mutateAsync: sendMessage, isPending: isSending } =
    useSendMessageMutation(productChatRoomId);
  const { mutateAsync: proposeAppointment } =
    useProposeAppointmentMutation(productChatRoomId);

  const router = useRouter();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [reportMessageId, setReportMessageId] = useState<number | null>(null);
  const [deleteConfirmMessageId, setDeleteConfirmMessageId] = useState<
    number | null
  >(null);
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(
    null
  );
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const {
    unseenCount,
    isKeyboardOpen,
    setMessageElement,
    scrollToMessageById,
    scrollToLatestMessage,
    prepareOwnMessageScroll,
    handleReceivedMessageScroll,
  } = useChatMessageViewport({
    messages,
    containerRef,
    isMobile,
    onInitialBottomAligned: () => setIsInitialBottomAligned(true),
  });

  const {
    searchMatchIds,
    trimmedSearchQuery,
    showSearchPendingNotice,
    showSearchEmptyNotice,
    showMobileSearchNavigator,
    navigateSearch,
    getSearchHighlightToneForMessage,
  } = useChatSearchNavigator({
    messages,
    searchQuery,
    searchNavigation,
    hasMore,
    isFetchingNextPage,
    loadMore,
    onSearchMetaChange,
    scrollToMessageById,
    isMobile,
    isKeyboardOpen,
  });

  useEffect(() => {
    // 서버 컴포넌트에서 이미 읽음 처리한 결과를 클라이언트 Query Cache에도 즉시 반영
    queryClient.setQueryData(
      queryKeys.chats.list(user.id),
      (oldRooms: ChatRoom[] | undefined) => {
        if (!oldRooms) return oldRooms;

        return oldRooms.map((room) =>
          room.id === productChatRoomId ? { ...room, unreadCount: 0 } : room
        );
      }
    );
    void queryClient.refetchQueries({
      queryKey: queryKeys.chats.unreadCount(user.id),
      type: "all",
    });
  }, [productChatRoomId, queryClient, user.id]);

  /**
   * 채팅방 목록 마지막 메시지 미리보기 동기화
   * - 현재 상세 화면에서 메시지 전송/삭제가 일어났을 때 목록 카드의 마지막 메시지와 시간을 함께 맞춘다.
   */
  const syncRoomPreviewMessage = useCallback(
    (nextMessage: ChatRoom["lastMessage"]) => {
      queryClient.setQueryData(
        queryKeys.chats.list(user.id),
        (oldRooms: ChatRoom[] | undefined) => {
          if (!oldRooms) return oldRooms;

          return oldRooms.map((room) =>
            room.id === productChatRoomId
              ? {
                  ...room,
                  lastMessage: nextMessage,
                  updated_at: nextMessage?.created_at ?? room.updated_at,
                }
              : room
          );
        }
      );
    },
    [productChatRoomId, queryClient, user.id]
  );

  /**
   * 메시지 삭제 확인창 열기
   * - 네이티브 confirm 대신 공용 ConfirmDialog를 사용해 앱 전반의 확인 UX를 통일
   */
  const handleDeleteMessage = useCallback(
    (messageId: number) => {
      if (deletingMessageId === messageId) return;
      setDeleteConfirmMessageId(messageId);
    },
    [deletingMessageId]
  );

  /**
   * 본인 메시지 삭제 실행
   * - 행은 유지한 채 삭제 상태만 반영하고, 현재 방의 마지막 메시지 미리보기도 함께 동기화
   */
  const confirmDeleteMessage = useCallback(async () => {
    if (deleteConfirmMessageId == null) return;
    if (deletingMessageId === deleteConfirmMessageId) return;

    setDeletingMessageId(deleteConfirmMessageId);

    try {
      const result = await deleteMessageAction(deleteConfirmMessageId);

      if (!result.success) {
        toast.error(result.error);
        return;
      }

      replaceMessage(result.data);

      if (messages[messages.length - 1]?.id === result.data.id) {
        syncRoomPreviewMessage(result.data);
      }

      toast.success("메시지를 삭제했습니다.");
      setDeleteConfirmMessageId(null);
    } catch {
      toast.error("메시지 삭제에 실패했습니다.");
    } finally {
      setDeletingMessageId(null);
    }
  }, [
    deleteConfirmMessageId,
    deletingMessageId,
    messages,
    replaceMessage,
    syncRoomPreviewMessage,
  ]);

  /**
   * 메시지 반응 토글 핸들러
   * - 같은 반응은 해제, 다른 반응은 교체
   * - 실시간 이벤트가 늦더라도 현재 방 캐시는 즉시 최신 메시지로 교체
   */
  const handleToggleReaction = useCallback(
    async (messageId: number, reactionKey: ChatMessageReactionKey) => {
      try {
        const result = await toggleMessageReactionAction(
          messageId,
          reactionKey
        );

        if (!result.success) {
          toast.error(result.error);
          return;
        }

        replaceMessage(result.data);
      } catch {
        toast.error("메시지 반응 처리에 실패했습니다.");
      }
    },
    [replaceMessage]
  );

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
        prepareOwnMessageScroll();
        addMessage(resData);
      }
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  /**
   * Supabase 실시간 웹소켓 구독
   */
  useChatSubscription({
    chatRoomId: productChatRoomId,
    currentUserId: user.id,
    throttleReadUpdate: true,
    onNewMessage: (newMessage) => {
      // 최신 구간 미확인 시 unseenCount만 증가, 화면 점프 방지
      handleReceivedMessageScroll(newMessage.user.id === user.id);
      addMessage(newMessage);
    },
    onMessageDeleted: ({ message, wasUnread }) => {
      replaceMessage(message);

      if (messages[messages.length - 1]?.id === message.id) {
        syncRoomPreviewMessage(message);
      } else if (wasUnread && message.user.id !== user.id) {
        queryClient.setQueryData(
          queryKeys.chats.list(user.id),
          (oldRooms: ChatRoom[] | undefined) => {
            if (!oldRooms) return oldRooms;

            return oldRooms.map((room) => {
              if (room.id !== productChatRoomId) return room;
              return {
                ...room,
                unreadCount: Math.max((room.unreadCount ?? 0) - 1, 0),
              };
            });
          }
        );
      }
    },
    onMessageReaction: (message) => {
      replaceMessage(message);
    },
    onMessagesRead: ({ readIds }) => updateMessagesRead(readIds),
    onAppointmentUpdate: (appointmentId, status) => {
      updateAppointmentStatus(appointmentId, status);
      // 예약 승인 시 헤더 뱃지 갱신을 위해 RSC를 리프레시함
      if (status === "ACCEPTED") router.refresh();
    },
  });

  /**
   * 메시지 전송 핸들러
   */
  const onSubmit = async (
    text?: string | null,
    imageUrl?: string | null,
    imageIsAnimated?: boolean
  ) => {
    try {
      const resData = await sendMessage({ text, imageUrl, imageIsAnimated });
      if (resData?.message) {
        prepareOwnMessageScroll();
        addMessage(resData.message);
        queryClient.setQueryData(
          queryKeys.chats.list(user.id),
          (oldRooms: ChatRoom[] | undefined) => {
            if (!oldRooms) return oldRooms;

            const targetRoom = oldRooms.find(
              (room) => room.id === productChatRoomId
            );
            if (!targetRoom) return oldRooms;

            const nextRooms = oldRooms
              .map((room) =>
                room.id === productChatRoomId
                  ? {
                      ...room,
                      lastMessage: resData.message,
                      unreadCount: 0,
                      updated_at: new Date(resData.message.created_at),
                    }
                  : room
              )
              .sort(
                (a, b) =>
                  new Date(b.updated_at).getTime() -
                  new Date(a.updated_at).getTime()
              );

            return nextRooms;
          }
        );
      }
      // 성공 시 비동기로 뱃지 획득 여부 체크
      void checkQuickResponseBadgeAction(user.id);
    } catch (error) {
      if (getErrorMessage(error) === "RATE_LIMITED") {
        toast.error("조금 천천히 보내주세요. 🐢");
      }
      throw error; // ChatInputBar에서 catch 하여 입력값을 복구하도록 에러를 전파
    }
  };

  return (
    <div className="relative flex flex-col flex-1 h-full min-h-0">
      {/* 메시지 스크롤 영역 */}
      <div
        ref={containerRef}
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pt-4 space-y-2 scrollbar"
      >
        <div ref={sentinelRef} />

        {(showSearchPendingNotice || showSearchEmptyNotice) && (
          <div className="sticky top-2 z-10 mb-3 flex justify-center px-2">
            {showSearchPendingNotice ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs font-medium text-primary shadow-sm">
                <span className="inline-block size-3.5 rounded-full border-2 border-brand/25 border-t-brand dark:border-brand-light/25 dark:border-t-brand-light animate-spin" />
                이전 대화까지 찾는 중...
              </div>
            ) : (
              <div className="max-w-[88%] rounded-2xl border border-border bg-background/95 px-3.5 py-2 text-center text-xs leading-relaxed text-muted shadow-sm">
                <span className="font-medium text-primary">
                  &apos;{trimmedSearchQuery}&apos;
                </span>
                에 대한 검색 결과가 없어요.
              </div>
            )}
          </div>
        )}

        {isFetchingNextPage && (
          <div className="py-2 text-center text-sm text-muted">
            <span className="inline-block size-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin mr-2 align-middle" />
            과거 메시지 불러오는 중...
          </div>
        )}

        {messages.map((message) => {
          if (message.type === "SYSTEM") {
            return (
              <div
                key={message.id}
                ref={(element) => setMessageElement(message.id, element)}
              >
                <SystemMessage
                  text={message.payload ?? ""}
                  searchHighlight={getSearchHighlightToneForMessage(message.id)}
                />
              </div>
            );
          }

          if (message.type === "APPOINTMENT") {
            const isOwn = message.user.id === user.id;
            return (
              <div
                key={message.id}
                ref={(element) => setMessageElement(message.id, element)}
                className={`flex w-full ${
                  isOwn ? "justify-end" : "justify-start"
                } py-2`}
              >
                <AppointmentBubble
                  message={message}
                  isOwnMessage={isOwn}
                  currentUserId={user.id}
                  isCounterpartyLeft={isCounterpartyLeft}
                  searchHighlight={getSearchHighlightToneForMessage(
                    message.id
                  )}
                />
              </div>
            );
          }
          return (
            <div
              key={message.id}
              ref={(element) => setMessageElement(message.id, element)}
            >
              <ChatMessageBubble
                message={message}
                currentUserId={user.id}
                isOwnMessage={message.user.id === user.id}
                showAvatar
                onReport={(id) => setReportMessageId(id)}
                onDelete={handleDeleteMessage}
                onReact={handleToggleReaction}
                searchHighlight={getSearchHighlightToneForMessage(message.id)}
              />
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* 안 읽은 새 메시지 안내 버튼 */}
      {unseenCount > 0 && !isKeyboardOpen && (
        <button
          type="button"
          onClick={() => {
            scrollToLatestMessage("smooth");
          }}
          className="focus-ring-soft absolute bottom-24 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border-subtle bg-background px-3 py-1.5 text-sm text-primary shadow-lg"
        >
          새 메시지 {unseenCount}개 보기
        </button>
      )}

      {showMobileSearchNavigator && (
        <div className="absolute bottom-28 right-3 z-20 sm:hidden">
          <div className="flex overflow-hidden rounded-2xl border border-border bg-background shadow-md ring-1 ring-border-subtle/70">
            <button
              type="button"
              onClick={() => navigateSearch("prev")}
              disabled={searchMatchIds.length <= 1}
              className="focus-ring-soft inline-flex size-11 items-center justify-center bg-background text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:text-muted/45"
              aria-label="이전 검색 결과"
            >
              <ChevronUpIcon className="size-5" />
            </button>
            <div className="w-px self-stretch bg-border-subtle" />
            <button
              type="button"
              onClick={() => navigateSearch("next")}
              disabled={searchMatchIds.length <= 1}
              className="focus-ring-soft inline-flex size-11 items-center justify-center bg-background text-muted transition-colors hover:bg-surface-dim hover:text-primary disabled:cursor-not-allowed disabled:text-muted/45"
              aria-label="다음 검색 결과"
            >
              <ChevronDownIcon className="size-5" />
            </button>
          </div>
        </div>
      )}

      {/* 하단 입력바 영역 */}
      <div className="shrink-0 w-full flex justify-center px-2 pt-2 bg-transparent z-30 pb-[max(env(safe-area-inset-bottom),1rem)] sm:pb-6">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-md">
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
      <ConfirmDialog
        open={deleteConfirmMessageId !== null}
        onCancel={() => {
          if (deletingMessageId !== null) return;
          setDeleteConfirmMessageId(null);
        }}
        onConfirm={confirmDeleteMessage}
        title="메시지를 삭제할까요?"
        description="삭제된 메시지는 대화 흐름을 위해 자리만 남고, 내용은 복구할 수 없습니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        loading={
          deleteConfirmMessageId !== null &&
          deletingMessageId === deleteConfirmMessageId
        }
      />
    </div>
  );
}
