// @vitest-environment jsdom
import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BottomSheet from "./BottomSheet";
import ModalPresence from "./ModalPresence";

const onClose = vi.fn();
function Sheet({ open }: { open: boolean }) {
  return (
    <ModalPresence open={open}>
      <BottomSheet open={open} title="테스트 시트" onClose={onClose}>
        <button>본문 버튼</button>
      </BottomSheet>
    </ModalPresence>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("React", React);
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false }))
  );
  vi.stubGlobal("scrollTo", vi.fn());
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("바텀시트 퇴장", () => {
  it("퇴장이 끝날 때까지 DOM과 스크롤 잠금을 유지하고 포커스를 복귀한다", () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const { rerender } = render(<Sheet open />);
    act(() => vi.advanceTimersByTime(32));
    expect(screen.getByLabelText("시트 닫기")).toHaveFocus();
    rerender(<Sheet open={false} />);
    act(() => vi.advanceTimersByTime(199));
    expect(document.querySelector('[role="dialog"]')).toBeInTheDocument();
    expect(document.querySelector("[inert]")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(trigger).toHaveFocus();
    trigger.remove();
  });

  it("퇴장 중 다시 열면 이전 타이머가 열린 시트를 제거하지 않는다", () => {
    const { rerender } = render(<Sheet open />);
    act(() => vi.advanceTimersByTime(32));
    rerender(<Sheet open={false} />);
    act(() => vi.advanceTimersByTime(100));
    rerender(<Sheet open />);
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("드래그가 취소되면 닫지 않고 원래 위치로 돌아온다", () => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    onClose.mockClear();
    render(<Sheet open />);
    act(() => vi.advanceTimersByTime(32));
    const panel = screen.getByRole("dialog");
    const handle = panel.firstElementChild as HTMLElement;
    handle.setPointerCapture = vi.fn();
    fireEvent.pointerDown(handle, { clientY: 10 });
    fireEvent.pointerMove(handle, { clientY: 150 });
    expect(panel.style.transform).toBe("translateY(140px)");
    fireEvent.pointerCancel(handle);
    expect(panel.style.transform).toBe("translateY(0px)");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("동작 줄이기에서는 퇴장 대기를 생략한다", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true }))
    );
    const { rerender } = render(<Sheet open />);
    act(() => vi.advanceTimersByTime(32));
    rerender(<Sheet open={false} />);
    act(() => vi.advanceTimersByTime(0));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
  });
});
