// @vitest-environment jsdom
import { useRef, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ImageZoomModal } from "./ZoomableImage";
import { useModalFocus } from "@/hooks/useModalFocus";

vi.mock("next/image", () => ({ default: () => null }));
afterEach(() => vi.restoreAllMocks());
function Nested() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [parent, setParent] = useState(true);
  useModalFocus({
    open: parent,
    containerRef: ref,
    onClose: () => setParent(false),
  });
  return (
    parent && (
      <div ref={ref} role="dialog" aria-label="상품 상세">
        <button onClick={() => setOpen(true)}>확대 보기</button>
        <ImageZoomModal
          open={open}
          src="/test.png"
          alt="상품"
          onClose={() => setOpen(false)}
        />
      </div>
    )
  );
}
it("중첩 이미지 모달의 초기 포커스·순환·Escape 단독 닫기와 복귀", async () => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {},
  ] as unknown as DOMRectList);
  render(<Nested />);
  const trigger = screen.getByRole("button", { name: "확대 보기" });
  await waitFor(() => expect(trigger).toHaveFocus());
  fireEvent.click(trigger);
  const close = screen.getByRole("button", { name: "이미지 확대 닫기" });
  await waitFor(() => expect(close).toHaveFocus());
  fireEvent.keyDown(close, { key: "Tab" });
  expect(screen.getByRole("button", { name: "이미지 확대" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(
    screen.queryByRole("dialog", { name: "이미지 확대 보기" })
  ).not.toBeInTheDocument();
  expect(screen.getByRole("dialog", { name: "상품 상세" })).toBeInTheDocument();
  expect(trigger).toHaveFocus();
});
