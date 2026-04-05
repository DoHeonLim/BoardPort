/**
 * File Name : hooks/useInfiniteScroll.ts
 * Description : 공통 무한 스크롤 관찰 훅
 * Author : 임도헌
 *
 * History
 * 2025.06.07  임도헌   Created   IntersectionObserver 기반 무한 스크롤 훅 구현
 * 2025.08.26  임도헌   Modified  enabled 옵션/여유 rootMargin/threshold 추가, 비동기 onLoadMore 안전 호출
 * 2025.08.26  임도헌   Modified  useInfiniteScroll ref 최적화
 * 2025.09.10  임도헌   Modified  내부 in-flight 가드(runningRef), triggerRef.current 의존성 캡처, root 옵션 지원
 * 2025.10.12  임도헌   Modified  안정성 보강
 * 2026.02.02  임도헌   Modified  주석 보강
 * 2026.02.28  임도헌   Modified  TanStack Query(fetchNextPage) 연동을 위해 onLoadMore 반환 타입(unknown) 확장
 * 2026.03.05  임도헌   Modified  주석 최신화
 */

"use client";

import { useEffect, useRef } from "react";

interface UseInfiniteScrollProps {
  /** 관찰 대상 요소의 Ref (스크롤 트리거) */
  triggerRef: React.RefObject<HTMLElement>;
  /** 더 불러올 데이터가 있는지 여부 */
  hasMore: boolean;
  /** 현재 데이터 로딩 중인지 여부 */
  isLoading: boolean;
  /** 데이터 로드 콜백 함수 (TanStack Query 반환값 호환을 위해 unknown 허용) */
  onLoadMore: () => unknown | Promise<unknown>;

  /**
   * 훅 활성화 여부 (예: 탭이 백그라운드일 때 false)
   * @default true
   */
  enabled?: boolean;
  /**
   * 스크롤 컨테이너 Ref (기본값: null -> Viewport 기준)
   */
  rootRef?: React.RefObject<Element | null>;
  /**
   * 관찰 영역 확장 범위 (미리 로딩하기 위함)
   * @default "1200px 0px 0px 0px"
   */
  rootMargin?: string;
  /**
   * 교차 임계값 (0.0 ~ 1.0)
   * @default 0.01
   */
  threshold?: number;
}

/**
 * 공통 무한 스크롤 관찰 훅
 *
 * - `IntersectionObserver` 기반의 추가 페이지 진입 감지
 * - `hasMore`/`isLoading`/`runningRef` 기반 중복 요청 차단
 * - `enabled` 비활성화 시 관찰자 해제
 *
 * @param {UseInfiniteScrollProps} props - 관찰 대상, 로딩 상태, 추가 호출 콜백 설정
 * @returns {void} 스크롤 트리거 관찰 등록
 */
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
  const runningRef = useRef(false);

  // 최신 조건/콜백 참조 유지
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

    const root = rootRef?.current ?? null;

    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;

        // 추가 로드 가능 여부 가드
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
