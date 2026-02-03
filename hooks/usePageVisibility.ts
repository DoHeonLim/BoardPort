/**
 * File Name : hooks/usePageVisibility.ts
 * Description : 페이지 가시성(visibility) 감지 훅 — 탭이 백그라운드면 false
 * Author : 임도헌
 *
 * History
 * 2025.08.26  임도헌   Created   document.visibilityState 기반 훅 구현
 * 2025.09.10  임도헌   Modified  초기 스냅샷 동기화, iOS 대응(pagehide/pageshow) 및 passive 리스너 추가
 * 2026.02.02  임도헌   Modified  주석 보강
 */

"use client";

import { useEffect, useState } from "react";

/**
 * 현재 페이지(탭)가 사용자에게 보이는 상태인지 반환합니다.
 *
 * - `document.visibilityState` API를 사용합니다.
 * - iOS Safari의 `pagehide`/`pageshow` 이벤트도 함께 감지하여 신뢰성을 높입니다.
 * - 무한 스크롤이나 폴링(Polling) 로직에서 탭이 백그라운드로 갔을 때 중단하는 용도로 유용합니다.
 *
 * @returns boolean - 가시성 여부 (true: 보임, false: 숨겨짐)
 */
export function usePageVisibility(): boolean {
  // 초기값: SSR 환경에서는 항상 true로 가정 (Hydration 불일치 방지)
  const [visible, setVisible] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return !document.hidden;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;

    const onVisibilityChange = () => setVisible(!document.hidden);
    const onPageHide = () => setVisible(false); // iOS Safari 대응
    const onPageShow = () => setVisible(true); // iOS Safari 대응

    document.addEventListener("visibilitychange", onVisibilityChange, {
      passive: true,
    });
    window.addEventListener("pagehide", onPageHide, { passive: true });
    window.addEventListener("pageshow", onPageShow, { passive: true });

    // 마운트 직후 상태 동기화
    onVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return visible;
}
