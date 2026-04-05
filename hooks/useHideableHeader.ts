/**
 * File Name : hooks/useHideableHeader.ts
 * Description : 모바일 헤더의 스크롤 숨김/재노출 동작을 공통 처리하는 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.10  임도헌   Created   모바일 헤더에서 아래 스크롤 숨김, 위 스크롤 재등장 동작을 공통 훅으로 분리
 * 2026.03.11  임도헌   Modified  누적 이동 거리와 토글 직후 무시 시간을 기준으로 흔들림 없는 숨김 제어 보강
 * 2026.03.17  임도헌   Modified  터치 제스처 방향과 최상단 보조 스크롤 감지 기반의 단순 hide/reveal 구조로 재정리
 * 2026.03.17  임도헌   Modified  Safari bounce와 문서 스크롤 소스를 고려한 scrollTop 계산 및 ResizeObserver 높이 측정 안정화
 */
"use client";

import { useEffect, useRef, useState } from "react";

const TOP_VISIBLE_SCROLL = 16;
const HIDE_GESTURE_DELTA = 10;
const SHOW_GESTURE_DELTA = 8;
const TOGGLE_GUARD_MS = 180;

/**
 * 모바일 헤더 hide/reveal 훅
 *
 * [동작]
 * - 아래 방향 터치 이동 시 헤더 숨김
 * - 위 방향 터치 이동 또는 문서 최상단 복귀 시 헤더 재노출
 * - `ResizeObserver`로 측정한 헤더 높이를 spacer 높이 유지에 사용
 */
export function useHideableHeader<T extends HTMLElement>() {
  const [isVisible, setIsVisible] = useState(true);
  const [headerHeight, setHeaderHeight] = useState(0);
  const visibleRef = useRef(true);
  const ignoreScrollUntilRef = useRef(0);
  const touchYRef = useRef<number | null>(null);
  const headerRef = useRef<T>(null);

  useEffect(() => {
    /** 브라우저별 문서 스크롤 위치 계산 */
    const getScrollTop = () =>
      // 실기기와 디바이스 에뮬레이션에서 실제 스크롤 소스가 달라 여러 값을 함께 반영한 현재 위치 계산
      Math.max(
        0,
        document.scrollingElement?.scrollTop ?? 0,
        document.documentElement.scrollTop,
        document.body.scrollTop,
        window.scrollY ?? 0,
        window.pageYOffset ?? 0
      );

    /** 헤더 노출 상태 반영 */
    const showHeader = () => {
      if (visibleRef.current) return;
      visibleRef.current = true;
      setIsVisible(true);
      ignoreScrollUntilRef.current = Date.now() + TOGGLE_GUARD_MS;
    };

    /** 헤더 숨김 상태 반영 */
    const hideHeader = () => {
      if (!visibleRef.current) return;
      visibleRef.current = false;
      setIsVisible(false);
      ignoreScrollUntilRef.current = Date.now() + TOGGLE_GUARD_MS;
    };

    /** 최상단 복귀 시 헤더 재노출 보조 */
    const handleScroll = () => {
      const currentY = getScrollTop();
      if (currentY <= TOP_VISIBLE_SCROLL) {
        showHeader();
      }
    };

    /** 터치 시작 위치 기록 */
    const handleTouchStart = (event: TouchEvent) => {
      touchYRef.current = event.touches[0]?.clientY ?? null;
    };

    /** 터치 방향 기반 hide/reveal 판정 */
    const handleTouchMove = (event: TouchEvent) => {
      const startY = touchYRef.current;
      const currentTouchY = event.touches[0]?.clientY;
      if (startY == null || currentTouchY == null) return;

      const scrollTop = getScrollTop();
      if (scrollTop <= TOP_VISIBLE_SCROLL) {
        // 최상단 bounce/미세 스크롤과 관계없는 헤더 재노출
        showHeader();
        touchYRef.current = currentTouchY;
        return;
      }

      if (Date.now() < ignoreScrollUntilRef.current) {
        touchYRef.current = currentTouchY;
        return;
      }

      const deltaY = currentTouchY - startY;

      if (deltaY <= -HIDE_GESTURE_DELTA) {
        // 위 방향 이동 기반 헤더 숨김
        hideHeader();
        touchYRef.current = currentTouchY;
        return;
      }

      if (deltaY >= SHOW_GESTURE_DELTA) {
        // 아래 방향 이동 기반 헤더 재노출
        showHeader();
        touchYRef.current = currentTouchY;
      }
    };

    /** 터치 추적 상태 초기화 */
    const resetTouch = () => {
      touchYRef.current = null;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", resetTouch, { passive: true });
    window.addEventListener("touchcancel", resetTouch, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", resetTouch);
      window.removeEventListener("touchcancel", resetTouch);
    };
  }, []);

  useEffect(() => {
    const element = headerRef.current;
    if (!element) return;

    /** 최초 헤더 높이 동기화 */
    const updateHeight = () => {
      const nextHeight = Math.ceil(element.getBoundingClientRect().height);
      setHeaderHeight(nextHeight);
    };

    updateHeight();

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      // 브라우저별 borderBoxSize 배열/객체 형식 차이 대응
      const boxSize = Array.isArray(entry.borderBoxSize)
        ? entry.borderBoxSize[0]
        : entry.borderBoxSize;
      const height = boxSize?.blockSize ?? entry.contentRect.height;

      setHeaderHeight(Math.ceil(height));
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  return {
    headerRef,
    headerHeight,
    isVisible,
  };
}
