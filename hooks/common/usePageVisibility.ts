/**
 * File Name : hooks/common/usePageVisibility.ts
 * Description : 페이지 가시성(visibility) 감지 훅 — 탭이 백그라운드면 false
 * Author : 임도헌
 *
 * History
 * 2025.08.26  임도헌   Created   document.visibilityState 기반 훅 구현
 * 2025.09.10  임도헌   Modified  초기 스냅샷 동기화, iOS 대응(pagehide/pageshow) 및 passive 리스너 추가
 * 2026.01.16  임도헌   Moved     hooks -> hooks/common
 */

"use client";

import { useEffect, useState } from "react";

/**
 * 현재 페이지(탭)의 가시성 여부를 반환한다.
 * - 포그라운드: true, 백그라운드/비가시: false
 * - 무한스크롤/폴링 등 네트워크 로직을 백그라운드에서 멈추는 용도로 사용.
 *
 * @example
 * const visible = usePageVisibility();
 * useInfiniteScroll({ enabled: visible, ... });
 */
export function usePageVisibility(): boolean {
  // 초기 스냅샷 동기화(SSR 안전)
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

    // 초기 동기화(혹시나 상태가 바뀐 뒤 마운트되는 경우)
    onVisibilityChange();

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", onPageHide);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  return visible;
}
