/**
 * File Name : features/chat/hooks/useChatMessageViewport.ts
 * Description : 채팅 메시지 뷰포트 훅 (초기 하단 정렬 + 자동 스크롤 + 모바일 키보드 감지)
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.21  임도헌   Created   ChatMessagesList의 메시지 DOM 레지스트리, 초기 하단 정렬, 새 메시지 스크롤 정책, 모바일 키보드 감지를 훅으로 분리
 * 2026.08.27  임도헌   Modified  메시지 검색 이동 시 모션 축소 설정을 기본 스크롤 정책에 반영
 * 2026.08.28  임도헌   Modified  메시지 등록·스크롤·키보드 감지 함수 JSDoc 보강
 */

"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/features/chat/types";
import { getMotionSafeScrollBehavior } from "@/lib/accessibility";

interface UseChatMessageViewportOptions {
  messages: ChatMessage[];
  containerRef: RefObject<HTMLDivElement | null>;
  isMobile: boolean;
  onInitialBottomAligned?: () => void;
}

/**
 * 메시지 뷰포트/스크롤 상태를 관리하는 훅
 *
 * [역할]
 * - 메시지 DOM 레지스트리를 유지해 특정 메시지로 점프할 수 있게 함
 * - 최초 진입 시 실제 마지막 메시지를 안정적으로 노출
 * - 실시간 수신/내가 보낸 메시지에 따라 자동 스크롤 여부를 제어
 * - 모바일 키보드 높이를 감지해 부유 버튼과 입력창이 겹치지 않도록 지원
 */
export default function useChatMessageViewport({
  messages,
  containerRef,
  isMobile,
  onInitialBottomAligned,
}: UseChatMessageViewportOptions) {
  const [unseenCount, setUnseenCount] = useState(0);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const isAtBottomRef = useRef(true);
  const hasInitialScrolledRef = useRef(false);
  const lastMessageIdRef = useRef<number | null>(null);
  const pendingScrollModeRef = useRef<"self" | "incoming" | null>(null);
  const messageElementMapRef = useRef(new Map<number, HTMLDivElement>());
  const BOTTOM_THRESHOLD_PX = 100;

  /**
   * 메시지 ID와 렌더링된 DOM 요소의 연결을 등록하거나 해제한다.
   *
   * @param messageId - 등록할 메시지 ID
   * @param element - 메시지 DOM 요소 또는 해제를 위한 null
   */
  const setMessageElement = useCallback(
    (messageId: number, element: HTMLDivElement | null) => {
      if (element) {
        messageElementMapRef.current.set(messageId, element);
        return;
      }

      messageElementMapRef.current.delete(messageId);
    },
    []
  );

  /**
   * 특정 메시지 DOM으로 스크롤 이동
   * - 검색 결과 이전/다음 이동과 최초 매치 자동 포커스에 사용
   *
   * @param messageId - 이동할 메시지 ID
   * @param behavior - 적용할 스크롤 동작
   */
  const scrollToMessageById = useCallback(
    (
      messageId: number,
      behavior: ScrollBehavior = getMotionSafeScrollBehavior()
    ) => {
      const targetElement = messageElementMapRef.current.get(messageId);
      if (!targetElement) return;

      targetElement.scrollIntoView({
        block: "center",
        behavior,
      });
    },
    []
  );

  /**
   * 마지막 메시지 또는 컨테이너 하단으로 이동하고 미확인 수를 초기화한다.
   *
   * @param behavior - 적용할 스크롤 동작
   */
  const scrollToLatestMessage = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const container = containerRef.current;
      if (!container || messages.length === 0) return;

      const lastMessage = messages[messages.length - 1];
      const targetElement = lastMessage
        ? messageElementMapRef.current.get(lastMessage.id)
        : null;

      if (targetElement) {
        targetElement.scrollIntoView({
          block: "end",
          behavior,
        });
      } else {
        container.scrollTo({
          top: container.scrollHeight,
          behavior,
        });
      }

      isAtBottomRef.current = true;
      setUnseenCount(0);
    },
    [containerRef, messages]
  );

  /**
   * 내가 보낸 메시지는 항상 최신 구간으로 따라가도록 예약
   * - 전송 성공 직후, 실시간 구독 수신보다 먼저 호출돼도 후속 effect가 마지막 메시지 변경을 감지해 하단 정렬
   */
  const prepareOwnMessageScroll = useCallback(() => {
    pendingScrollModeRef.current = "self";
  }, []);

  /**
   * 실시간으로 들어온 메시지의 스크롤 정책을 결정
   * - 최신 구간을 보고 있으면 부드럽게 따라가고, 과거 메시지를 읽는 중이면 점프하지 않고 unseenCount만 올린다.
   */
  const handleReceivedMessageScroll = useCallback((isOwnMessage: boolean) => {
    if (isOwnMessage) {
      pendingScrollModeRef.current = "self";
      return;
    }

    if (isAtBottomRef.current) {
      pendingScrollModeRef.current = "incoming";
      return;
    }

    pendingScrollModeRef.current = null;
    setUnseenCount((count) => count + 1);
  }, []);

  /**
   * 스크롤 바닥 여부 감지
   * - 사용자가 최신 구간에 머무는지 여부를 추적해 실시간 수신 시 자동 스크롤 여부를 결정
   */
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    /** 현재 하단 거리를 계산해 자동 스크롤 기준과 미확인 수를 갱신한다. */
    const onScroll = () => {
      const distanceToBottom =
        element.scrollHeight - (element.scrollTop + element.clientHeight);
      const atBottom = distanceToBottom <= BOTTOM_THRESHOLD_PX;
      isAtBottomRef.current = atBottom;

      if (atBottom) {
        setUnseenCount(0);
      }
    };

    element.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => element.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  /**
   * 모바일 키보드 감지
   * - visualViewport 높이가 줄어든 동안 부유 버튼을 숨겨 입력창과의 겹침을 줄인다.
   */
  useEffect(() => {
    if (!isMobile || !window.visualViewport) {
      setIsKeyboardOpen(false);
      return;
    }

    const viewport = window.visualViewport;
    /** Visual Viewport 축소 폭으로 모바일 키보드의 열림 상태를 판정한다. */
    const detectKeyboard = () => {
      const keyboardHeight =
        window.innerHeight - viewport.height - viewport.offsetTop;
      setIsKeyboardOpen(keyboardHeight > 120);
    };

    detectKeyboard();
    viewport.addEventListener("resize", detectKeyboard);
    viewport.addEventListener("scroll", detectKeyboard);

    return () => {
      viewport.removeEventListener("resize", detectKeyboard);
      viewport.removeEventListener("scroll", detectKeyboard);
    };
  }, [isMobile]);

  /**
   * 실시간/전송으로 마지막 메시지가 갱신되었을 때만 자동 스크롤
   * - self: 내가 보낸 메시지는 항상 최신 위치로 이동
   * - incoming: 사용자가 이미 최신 구간을 보고 있을 때만 따라감
   * - null: 과거 메시지 탐색 중 들어온 새 메시지이므로 점프하지 않음
   */
  useEffect(() => {
    if (!hasInitialScrolledRef.current) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    if (lastMessageIdRef.current === lastMessage.id) return;

    lastMessageIdRef.current = lastMessage.id;

    const pendingMode = pendingScrollModeRef.current;
    pendingScrollModeRef.current = null;

    if (!pendingMode) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToLatestMessage(pendingMode === "incoming" ? "smooth" : "auto");
      });
    });
  }, [messages, scrollToLatestMessage]);

  /**
   * 최초 진입 시 실제 마지막 메시지를 우선 노출
   * - 렌더 직후 마지막 메시지 DOM 기준으로 정렬하여 이미지/버블 높이 차이에도 안정적으로 맞춤
   * - 타깃 DOM을 찾지 못하면 기존처럼 최하단으로 이동
   * - 초기 바닥 정렬이 끝나기 전에는 상단 fetchMore를 막아 긴 채팅방에서 과거 메시지 로드와 경쟁하지 않도록 유지
   */
  useEffect(() => {
    if (hasInitialScrolledRef.current || messages.length === 0) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        scrollToLatestMessage("auto");
        lastMessageIdRef.current = messages[messages.length - 1]?.id ?? null;
        hasInitialScrolledRef.current = true;
        onInitialBottomAligned?.();
      });
    });
  }, [messages, onInitialBottomAligned, scrollToLatestMessage]);

  return {
    unseenCount,
    isKeyboardOpen,
    setMessageElement,
    scrollToMessageById,
    scrollToLatestMessage,
    prepareOwnMessageScroll,
    handleReceivedMessageScroll,
  };
}
