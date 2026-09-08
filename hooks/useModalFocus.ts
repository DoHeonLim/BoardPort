/**
 * File Name : hooks/useModalFocus.ts
 * Description : 모달 초기 포커스·Tab 순환·Escape 닫기·포커스 복귀 공용 훅
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   중첩 모달 순서를 고려한 공용 포커스 관리 정책 추가
 * 2026.08.28  임도헌   Modified  모달 키보드 처리 함수 JSDoc 보강
 */

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  'input:not([disabled]):not([type="hidden"])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "details > summary:first-of-type",
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const activeModalStack: symbol[] = [];

interface UseModalFocusOptions {
  open: boolean;
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  initialFocusRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
  closeOnEscape?: boolean;
  restoreFocus?: boolean;
  focusOnOpen?: boolean;
}

/** 모달 내부에서 현재 키보드 탐색이 가능한 요소만 DOM 순서대로 반환 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (element) =>
      !element.closest('[aria-hidden="true"],[inert]') &&
      element.getClientRects().length > 0
  );
}

/**
 * 현재 Tab 방향과 포커스 위치를 기준으로 순환시킬 다음 요소를 결정
 *
 * @returns 포커스를 강제로 옮겨야 할 경계 요소, 일반 이동이면 null
 */
export function resolveModalTabTarget<T>(
  focusableElements: T[],
  activeElement: T | null,
  shiftKey: boolean,
  activeInside: boolean
): T | null {
  if (focusableElements.length === 0) return null;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeIndex = activeElement
    ? focusableElements.indexOf(activeElement)
    : -1;

  if (!activeInside || activeIndex === -1) {
    return shiftKey ? lastElement : firstElement;
  }
  if (shiftKey && activeElement === firstElement) return lastElement;
  if (!shiftKey && activeElement === lastElement) return firstElement;
  return null;
}

/**
 * 모달의 키보드 포커스 수명 주기를 공통 정책으로 관리
 *
 * - 열리면 지정 요소, 첫 상호작용 요소, 모달 컨테이너 순서로 포커스
 * - Tab/Shift+Tab 포커스를 모달 내부에서 순환
 * - 중첩 모달에서는 가장 나중에 열린 모달만 Escape와 Tab을 처리
 * - 닫히면 열기 직전 포커스로 복귀
 */
export function useModalFocus({
  open,
  containerRef,
  onClose,
  initialFocusRef,
  enabled = true,
  closeOnEscape = true,
  restoreFocus = true,
  focusOnOpen = true,
}: UseModalFocusOptions) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !enabled) return;

    const modalToken = Symbol("modal-focus");
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    activeModalStack.push(modalToken);

    const focusTimer = focusOnOpen
      ? window.setTimeout(() => {
          const container = containerRef.current;
          if (!container) return;

          const initialTarget =
            initialFocusRef?.current ??
            getFocusableElements(container)[0] ??
            container;
          initialTarget.focus();
        }, 0)
      : undefined;

    /**
     * 최상위 모달에서 Escape 닫기와 Tab 포커스 순환을 처리한다.
     *
     * @param event - 문서에서 발생한 키보드 이벤트
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (activeModalStack.at(-1) !== modalToken) return;

      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const container = containerRef.current;
      if (!container) return;

      const focusableElements = getFocusableElements(container);
      if (focusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const activeElement = document.activeElement;
      const nextFocusTarget = resolveModalTabTarget(
        focusableElements,
        activeElement instanceof HTMLElement ? activeElement : null,
        event.shiftKey,
        container.contains(activeElement)
      );

      if (nextFocusTarget) {
        event.preventDefault();
        nextFocusTarget.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      if (focusTimer !== undefined) window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);

      const stackIndex = activeModalStack.lastIndexOf(modalToken);
      if (stackIndex >= 0) activeModalStack.splice(stackIndex, 1);

      if (restoreFocus && previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [
    closeOnEscape,
    containerRef,
    enabled,
    focusOnOpen,
    initialFocusRef,
    open,
    restoreFocus,
  ]);
}
