/**
 * File Name : features/chat/hooks/useInfiniteMessages.ts
 * Description : 채팅방 무한스크롤 메시지 훅 (상단 로딩)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.15  임도헌   Created   무한스크롤 메시지 관리
 * 2025.07.22  임도헌   Modified  단계별 주석 추가 및 코드 흐름 설명 강화
 * 2025.11.21  임도헌   Modified  메시지가 아예 없을 때 fetchMore 방지
 * 2026.01.03  임도헌   Modified  IntersectionObserver root 지정, 스크롤 보정(diff 기반)으로 안정화
 * 2026.01.16  임도헌   Moved     hooks -> hooks/chat
 * 2026.01.18  임도헌   Moved     hooks/chat -> features/chat/hooks
 * 2026.01.28  임도헌   Modified  주석 보강
 * 2026.03.01  임도헌   Modified  TanStack Query(useInfiniteQuery) 기반으로 리팩토링 및 수동 상태 동기화 제거
 * 2026.03.03  임도헌   Modified  useSuspenseInfiniteQuery 적용 및 initialMessages Prop Drilling 제거
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import {
  useSuspenseInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getMoreMessagesAction } from "@/features/chat/actions/messages";
import { queryKeys } from "@/lib/queryKeys";
import { MESSAGE_LOAD_LIMIT } from "@/features/chat/constants";
import type { ChatMessage } from "@/features/chat/types";
import type { AppointmentStatus } from "@/generated/prisma/enums";

/**
 * 채팅방 메시지 무한 스크롤 및 캐시 상태 관리 훅
 *
 * [기능 및 동작 원리]
 * 1. `useSuspenseInfiniteQuery`를 사용하여 초기 메시지 및 과거 메시지(무한 스크롤)를 선언적으로 가져옴
 * 2. 역방향 페이징: 서버에서 최신 메시지부터 역순으로 가져오므로, 가져온 데이터의 첫 번째(`lastPage[0].id`)를 다음 커서로 사용
 * 3. 캐시 조작: 실시간 웹소켓(Supabase) 이벤트 발생 시 화면 전체를 리패치하지 않도록 `addMessage`, `updateMessagesRead` 등의 로컬 갱신 함수를 노출
 * 4. 스크롤 보정: 과거 메시지를 렌더링하기 전후의 `scrollHeight`를 비교하여 상단으로 튀는 현상을 방지
 *
 * @param {string} chatRoomId - 채팅방 ID
 */
export default function useInfiniteMessages(chatRoomId: string) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.chats.messages(chatRoomId);

  const containerRef = useRef<HTMLDivElement>(null); // 전체 스크롤 영역
  const sentinelRef = useRef<HTMLDivElement>(null); // 상단 로딩 트리거 센서
  const messagesEndRef = useRef<HTMLDivElement>(null); // 하단 강제 스크롤용 앵커

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useSuspenseInfiniteQuery({
      queryKey,
      queryFn: async ({ pageParam }) => {
        // null 커서일 경우 내부 Action에서 최신(초기) 메시지를 가져오도록 처리
        const res = await getMoreMessagesAction(
          chatRoomId,
          pageParam as number | null
        );
        if (!res.success) throw new Error(res.error);
        return res.data ?? [];
      },
      initialPageParam: null as number | null,
      getNextPageParam: (lastPage) => {
        // LIMIT보다 적게 가져왔다면 더 이상 과거 데이터가 없다고 판단
        if (!lastPage || lastPage.length < MESSAGE_LOAD_LIMIT) return undefined;
        return lastPage[0].id;
      },
      staleTime: 60 * 1000,
    });

  /**
   * 2차원 데이터를 역방향(과거 -> 최신)으로 평탄화
   * - TanStack Query는 과거 데이터를 배열의 끝(새 페이지)에 추가함 `[최신 페이지, 과거 페이지1, 과거 페이지2]`
   * - 채팅 UI는 위에서부터 과거, 아래에 최신 메시지가 필요하므로 `reverse()` 후 평탄화
   */
  const messages = useMemo(() => {
    if (!data) return [];
    return [...data.pages].reverse().flatMap((page) => page);
  }, [data]);

  // ===========================================================================
  // 캐시 조작 (Cache Manipulators) - 웹소켓 수신 및 직접 조작 시 활용
  // ===========================================================================

  const addMessage = useCallback(
    (newMessage: ChatMessage) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0)
          return oldData;

        // 1. 전체 페이지를 순회하여 이미 존재하는 메시지인지 딥 체크(Deep Check) 수행함
        const messageExists = oldData.pages.some((page: ChatMessage[]) =>
          page.some((m) => m.id === newMessage.id)
        );

        if (messageExists) return oldData;

        const newPages = [...oldData.pages];
        const newestPage = [...newPages[0]];

        // 2. 가장 최근 데이터 배열(pages[0])의 끝에 새 메시지를 추가함
        newPages[0] = [...newestPage, newMessage];
        return { ...oldData, pages: newPages };
      });
    },
    [queryClient, queryKey]
  );

  const updateMessagesRead = useCallback(
    (readIds: number[]) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0)
          return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: ChatMessage[]) =>
            page.map((msg) =>
              readIds.includes(msg.id) ? { ...msg, isRead: true } : msg
            )
          ),
        };
      });
    },
    [queryClient, queryKey]
  );

  const updateAppointmentStatus = useCallback(
    (appId: number, status: AppointmentStatus) => {
      queryClient.setQueryData(queryKey, (oldData: any) => {
        if (!oldData || !oldData.pages || oldData.pages.length === 0)
          return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page: ChatMessage[]) =>
            page.map((msg) =>
              msg.appointment?.id === appId
                ? { ...msg, appointment: { ...msg.appointment, status } }
                : msg
            )
          ),
        };
      });
    },
    [queryClient, queryKey]
  );

  // ===========================================================================
  // 스크롤 보정 및 옵저버 로직
  // ===========================================================================

  const fetchMore = useCallback(async () => {
    if (isFetchingNextPage || !hasNextPage) return;

    const container = containerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;

    await fetchNextPage();

    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;
      const delta = el.scrollHeight - prevScrollHeight;
      el.scrollTop = prevScrollTop + delta;
    });
  }, [fetchNextPage, isFetchingNextPage, hasNextPage]);

  useEffect(() => {
    const rootEl = containerRef.current;
    const target = sentinelRef.current;

    if (!rootEl || !target || !hasNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchMore();
        }
      },
      {
        root: rootEl,
        threshold: 0,
        rootMargin: "80px 0px 0px 0px",
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchMore, hasNextPage]);

  return {
    messages,
    isFetchingNextPage,
    hasMore: !!hasNextPage,
    containerRef,
    sentinelRef,
    messagesEndRef,
    addMessage,
    updateMessagesRead,
    updateAppointmentStatus,
  };
}
