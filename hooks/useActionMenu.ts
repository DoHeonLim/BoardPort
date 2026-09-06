import { useEffect, type RefObject, type KeyboardEvent } from "react";

/** 상세 액션 메뉴의 초기 항목·방향키 탐색과 닫기 시 트리거 복귀 관리 */
export function useActionMenu(
  containerRef: RefObject<HTMLDivElement | null>,
  open: boolean,
  onClose: () => void
) {
  useEffect(() => {
    if (open)
      containerRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]')
        ?.focus();
  }, [open, containerRef]);

  return (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    const container = containerRef.current;
    const items = Array.from(
      container?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([disabled])'
      ) ?? []
    );
    const index = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      container?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
    } else if (event.key === "Tab") {
      // 트리거 기준 기본 Tab 이동을 유지해 부모 모달의 탐색 순서와 연결
      container?.querySelector<HTMLElement>('[aria-haspopup="menu"]')?.focus();
      onClose();
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next]?.focus();
    }
  };
}
