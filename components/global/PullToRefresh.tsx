"use client";

/**
 * File Name : components/global/PullToRefresh.tsx
 * Description : 모바일 전용 상단 당겨서 새로고침 래퍼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.16  임도헌   Created   목록 탭(제품/게시글/스트림) 공용 pull-to-refresh 래퍼 추가
 * 2026.03.17  임도헌   Modified  브라우저 개입을 줄인 상단 인디케이터 기반 단순 구조로 재정리
 * 2026.03.17  임도헌   Modified  래퍼 내부 상대좌표와 화면 높이 비례 시작 영역을 사용해 상단 요약/첫 카드 영역까지 자연스럽게 확장
 * 2026.03.17  임도헌   Modified  문서 스크롤 소스를 통일해 최상단 판정과 모바일 hideable header 동작을 일관화
 * 2026.04.13  임도헌   Modified  CLS 민감 페이지에서 기능을 끌 수 있도록 enabled 옵션 추가 및 인디케이터 비활성 시 DOM 마운트 제거
 */

import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const PULL_THRESHOLD = 72;
const MAX_PULL_DISTANCE = 84;
const REFRESH_SETTLE_MS = 700;
const MIN_ACTIVATION_ZONE_PX = 176;
const MAX_ACTIVATION_ZONE_PX = 320;
const PULL_START_SLOP = 12;

interface PullToRefreshProps {
  children: ReactNode;
  className?: string;
  enabled?: boolean;
}

/**
 * 모바일 목록 영역 전용 pull-to-refresh 래퍼
 *
 * [동작]
 * - 모바일 화면에서 문서 최상단 + 상단 시작 영역에서만 아래로 당기기 제스처를 감지
 * - 콘텐츠 자체는 이동시키지 않고, 상단 인디케이터만으로 pull 상태를 안내
 * - 임계값 이상 당기고 손을 떼면 `router.refresh()`를 실행
 * - 데스크톱에서는 제스처를 비활성화하여 기존 스크롤 동작 유지
 */
export default function PullToRefresh({
  children,
  className,
  enabled = true,
}: PullToRefreshProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const settleTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (settleTimeoutRef.current) {
        window.clearTimeout(settleTimeoutRef.current);
      }
    };
  }, []);

  /** 브라우저별 문서 스크롤 위치 계산 */
  const getScrollTop = () =>
    // 실기기와 디바이스 에뮬레이션 차이를 함께 흡수하는 hideable header 공통 기준의 실제 문서 스크롤 위치 계산
    Math.max(
      0,
      document.scrollingElement?.scrollTop ?? 0,
      document.documentElement.scrollTop,
      document.body.scrollTop,
      window.scrollY ?? 0,
      window.pageYOffset ?? 0
    );

  /** pull 상태 초기화 */
  const resetPullState = () => {
    startXRef.current = null;
    startYRef.current = null;
    draggingRef.current = false;
    setPullDistance(0);
  };

  /** pull-to-refresh 후보 제스처 시작 */
  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (typeof window === "undefined") return;
    if (!enabled) return;
    if (window.innerWidth >= 768) return;
    if (isRefreshing) return;
    if (getScrollTop() > 0) return;
    const startTouch = event.touches[0];
    if (!startTouch) return;
    const wrapperTop = wrapperRef.current?.getBoundingClientRect().top ?? 0;
    const relativeStartY = startTouch.clientY - wrapperTop;
    // 헤더/상단 요약 영역 안에서 시작한 제스처만 pull 후보 처리
    const activationZonePx = Math.min(
      MAX_ACTIVATION_ZONE_PX,
      Math.max(MIN_ACTIVATION_ZONE_PX, window.innerHeight * 0.32)
    );
    if (relativeStartY > activationZonePx) return;

    startXRef.current = startTouch.clientX;
    startYRef.current = startTouch.clientY;
    draggingRef.current = true;
  };

  /** pull 거리 계산 */
  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (typeof window === "undefined") return;
    if (!enabled) return;
    if (!draggingRef.current || startYRef.current == null) return;
    if (window.innerWidth >= 768) return;
    if (getScrollTop() > 0) {
      resetPullState();
      return;
    }

    const currentTouch = event.touches[0];
    if (!currentTouch) return;

    const deltaY = currentTouch.clientY - startYRef.current;
    const deltaX = currentTouch.clientX - (startXRef.current ?? currentTouch.clientX);

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      resetPullState();
      return;
    }

    if (deltaY <= 0) {
      resetPullState();
      return;
    }

    if (deltaY <= PULL_START_SLOP) {
      return;
    }

    // 콘텐츠 고정 상태의 인디케이터 이동 감쇠
    const nextDistance = Math.min(
      (deltaY - PULL_START_SLOP) * 0.35,
      MAX_PULL_DISTANCE
    );
    setPullDistance(nextDistance);
  };

  /** pull 완료 시 새로고침 실행 */
  const handleTouchEnd = () => {
    if (!enabled) return;
    if (!draggingRef.current) return;

    draggingRef.current = false;
    startXRef.current = null;
    startYRef.current = null;

    if (pullDistance < PULL_THRESHOLD) {
      setPullDistance(0);
      return;
    }

    // 임계값 충족 시에만 서버 컴포넌트 트리 재조회
    setIsRefreshing(true);
    setPullDistance(PULL_THRESHOLD / 2);

    startTransition(() => {
      router.refresh();
    });

    if (settleTimeoutRef.current) {
      window.clearTimeout(settleTimeoutRef.current);
    }

    settleTimeoutRef.current = window.setTimeout(() => {
      setIsRefreshing(false);
      setPullDistance(0);
    }, REFRESH_SETTLE_MS);
  };

  const indicatorVisible = isRefreshing || pullDistance > 0;
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      ref={wrapperRef}
      className={cn("relative", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {indicatorVisible ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center transition-opacity duration-200 md:hidden"
          style={{
            transform: `translateY(${Math.max(8, pullDistance * 0.4)}px)`,
          }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs font-medium text-muted shadow-sm backdrop-blur-sm">
            <ArrowPathIcon
              className={cn(
                "size-4 transition-transform duration-200",
                isRefreshing ? "animate-spin" : ""
              )}
              style={{
                transform: isRefreshing
                  ? undefined
                  : `rotate(${progress * 180}deg)`,
              }}
            />
            <span>
              {isRefreshing
                ? "새로고침 중..."
                : pullDistance >= PULL_THRESHOLD
                  ? "손을 떼면 새로고침"
                  : "아래로 당겨 새로고침"}
            </span>
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}
