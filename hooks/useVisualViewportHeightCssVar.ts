/**
 * File Name : hooks/useVisualViewportHeightCssVar.ts
 * Description : 모바일 visualViewport 높이를 CSS 변수로 동기화하는 클라이언트 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.28  임도헌   Created   모바일 키보드 오픈 시 실제 가시 viewport 높이를 레이아웃에 전달
 */
"use client";

import { useEffect } from "react";

/**
 * visualViewport 높이 CSS 변수 동기화
 *
 * @param variableName - documentElement에 기록할 CSS 변수명
 */
export default function useVisualViewportHeightCssVar(
  variableName: `--${string}`
) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;

    const syncViewportHeight = () => {
      document.documentElement.style.setProperty(
        variableName,
        `${viewport.height}px`
      );
    };

    syncViewportHeight();
    viewport.addEventListener("resize", syncViewportHeight);
    viewport.addEventListener("scroll", syncViewportHeight);

    return () => {
      viewport.removeEventListener("resize", syncViewportHeight);
      viewport.removeEventListener("scroll", syncViewportHeight);
      document.documentElement.style.removeProperty(variableName);
    };
  }, [variableName]);
}
