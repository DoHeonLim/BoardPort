/**
 * File Name : hooks/chat/useInfiniteMessages.ts
 * Description : 채팅방 무한스크롤 메시지 훅 (상단 로딩)
 * Author : 임도헌
 *
 * Key Points
 * - IntersectionObserver의 root를 "스크롤 컨테이너"로 지정하여, viewport 기준 오작동을 방지
 * - 과거 메시지 prepend 시 스크롤 위치 유지: (scrollHeight diff) 기반으로 안정적으로 보정
 * - 메시지가 없으면 fetchMore를 중단(hasMore=false)
 *
 * History
 * Date        Author   Status    Description
 * 2025.07.15  임도헌   Created   무한스크롤 메시지 관리
 * 2025.07.22  임도헌   Modified  단계별 주석 추가 및 코드 흐름 설명 강화
 * 2025.11.21  임도헌   Modified  메시지가 아예 없을 때 fetchMore 방지
 * 2026.01.03  임도헌   Modified  IntersectionObserver root 지정, 스크롤 보정(diff 기반)으로 안정화
 * 2026.01.16  임도헌   Moved     hooks -> hooks/chat
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { ChatMessage } from "@/types/chat";
import { getMoreMessagesAction } from "@/app/chats/[id]/actions/messages";

/**
 * useInfiniteMessages
 * - 초기 메시지를 기반으로 상태 관리
 * - IntersectionObserver를 활용한 상단 무한스크롤 구현
 * - 메시지 추가, 교체, 스크롤 위치 유지 등의 기능 포함
 *
 * initialMessages - 최초 서버사이드로 전달된 메시지 목록
 * chatRoomId - 채팅방 고유 ID (더 불러오기용)
 */
export default function useInfiniteMessages(
  initialMessages: ChatMessage[],
  chatRoomId: string
) {
  /** 상태 정의 */
  const [messages, setMessages] = useState(initialMessages); // 전체 메시지 리스트
  const [isFetching, setIsFetching] = useState(false); // 로딩 상태
  const [hasMore, setHasMore] = useState(true); // 더 불러올 메시지가 있는지 여부

  /** DOM 참조 */
  const containerRef = useRef<HTMLDivElement>(null); // 전체 스크롤 영역
  const sentinelRef = useRef<HTMLDivElement>(null); // 무한스크롤 트리거 요소(상단)
  const messagesEndRef = useRef<HTMLDivElement>(null); // 스크롤 최하단 위치

  /**
   * 과거 메시지 불러오기
   * - 가장 오래된 메시지를 기준으로 추가 fetch
   * - 결과가 없으면 hasMore를 false로 변경
   * - prepend 이후 스크롤 위치를 "높이 diff"로 보정해 사용자가 보고 있던 위치가 튀지 않도록 유지
   */
  const fetchMore = useCallback(async () => {
    if (isFetching || !hasMore) return;

    // 메시지가 아예 없을 때 fetchMore 방지
    const firstMessageId = messages[0]?.id;
    if (!firstMessageId) {
      setHasMore(false);
      return;
    }

    const container = containerRef.current;

    // prepend 전에 현재 스크롤 상태 저장
    const prevScrollHeight = container?.scrollHeight ?? 0;
    const prevScrollTop = container?.scrollTop ?? 0;

    setIsFetching(true);

    const result = await getMoreMessagesAction(chatRoomId, firstMessageId);

    if (!result.success) {
      console.error("메시지 로딩 실패:", result.error);
      setIsFetching(false);
      return;
    }

    const incoming = result.data ?? [];

    if (incoming.length === 0) {
      setHasMore(false);
      setIsFetching(false);
      return;
    }

    // prepend
    setMessages((prev) => [...incoming, ...prev]);

    // DOM 반영 이후 스크롤 보정: (새 scrollHeight - 이전 scrollHeight) 만큼 scrollTop을 더해준다
    requestAnimationFrame(() => {
      const el = containerRef.current;
      if (!el) return;

      const nextScrollHeight = el.scrollHeight;
      const delta = nextScrollHeight - prevScrollHeight;

      // 기존에 보고 있던 메시지가 같은 위치에 있도록 유지
      el.scrollTop = prevScrollTop + delta;
    });

    setIsFetching(false);
  }, [isFetching, hasMore, messages, chatRoomId]);

  /**
   * IntersectionObserver로 무한스크롤 감지
   * - sentinelRef가 "컨테이너" 내부에서 상단에 닿을 때 fetchMore 호출
   * - root를 지정하지 않으면 viewport 기준이 되어 컨테이너 스크롤에서 오작동할 수 있음
   */
  useEffect(() => {
    const rootEl = containerRef.current;
    const target = sentinelRef.current;

    if (!rootEl || !target) return;
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          fetchMore();
        }
      },
      {
        root: rootEl,
        threshold: 0,
        // 상단 근처에서 미리 로딩되도록 약간의 여유를 둔다
        rootMargin: "80px 0px 0px 0px",
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchMore, hasMore]);

  return {
    messages,
    isFetching,
    hasMore,
    setMessages,
    containerRef,
    sentinelRef,
    messagesEndRef,
    fetchMore, // 디버깅/수동 로딩 트리거용(필요 없으면 빼도 됨)
  };
}
