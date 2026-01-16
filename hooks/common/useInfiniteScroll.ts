/**
 * File Name : hooks/common/useInfiniteScroll.ts
 * Description : 공통 무한 스크롤 관찰 훅
 * Author : 임도헌
 *
 * History
 * 2025.06.07  임도헌   Created   IntersectionObserver 기반 무한 스크롤 훅 구현
 * 2025.08.26  임도헌   Modified  enabled 옵션/여유 rootMargin/threshold 추가, 비동기 onLoadMore 안전 호출
 * 2025.08.26  임도헌   Modified  useInfiniteScroll ref 최적화
 * 2025.09.10  임도헌   Modified  내부 in-flight 가드(runningRef), triggerRef.current 의존성 캡처, root 옵션 지원
 * 2025.10.12  임도헌   Modified  안정성 보강
 * 2026.01.16  임도헌   Moved     hooks -> hooks/common
 */

"use client";

import { useEffect, useRef } from "react";

interface UseInfiniteScrollProps {
  triggerRef: React.RefObject<HTMLElement>; // 스크롤 트리거가 될 요소 ref
  hasMore: boolean; // 더 불러올 데이터가 존재하는지 여부
  isLoading: boolean; // 로딩 중 여부(상위 state)
  onLoadMore: () => void | Promise<void>; // 데이터 더 불러오기 콜백(동기/비동기 가능)

  /**
   * 추가 옵션
   * - enabled: false이면 관찰/호출 중단(예: 탭 비가시 상태에서 중단)
   * - root: 스크롤 컨테이너(Element). 기본: viewport
   * - rootMargin: 조기 로딩 여유 영역. 기본: "1200px 0px 0px 0px"
   * - threshold: 교차 임계값(0~1). 기본: 0.01
   */
  enabled?: boolean;
  rootRef?: React.RefObject<Element | null>;
  rootMargin?: string;
  threshold?: number;
}

export function useInfiniteScroll({
  triggerRef,
  hasMore,
  isLoading,
  onLoadMore,
  enabled = true,
  rootRef,
  rootMargin = "1200px 0px 0px 0px",
  threshold = 0.01,
}: UseInfiniteScrollProps): void {
  const hasMoreRef = useRef(hasMore);
  const isLoadingRef = useRef(isLoading);
  const onLoadMoreRef = useRef(onLoadMore);
  const runningRef = useRef(false); // 훅 내부 즉시 가드(중복 호출 방지)

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    if (!enabled) return;

    const el = triggerRef.current;
    if (!el) return;

    // rootRef는 mount 후에야 값이 생기므로, 매 렌더마다 현재값 읽음
    const root = rootRef?.current ?? null;

    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        if (!hasMoreRef.current || isLoadingRef.current || runningRef.current)
          return;

        runningRef.current = true;
        Promise.resolve(onLoadMoreRef.current())
          .catch(console.error)
          .finally(() => {
            runningRef.current = false;
          });
      },
      { threshold, rootMargin, root }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [enabled, triggerRef, rootRef, rootMargin, threshold]);
}

export default useInfiniteScroll;
