// @vitest-environment jsdom
import { useRef, useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useActionMenu } from "./useActionMenu";

function Menu() {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const onKeyDown = useActionMenu(ref, open, () => setOpen(false));
  return (
    <div ref={ref} onKeyDown={onKeyDown}>
      <button aria-haspopup="menu" onClick={() => setOpen(true)}>
        메뉴
      </button>
      {open && (
        <div role="menu">
          <button role="menuitem">수정</button>
          <button role="menuitem">삭제</button>
        </div>
      )}
    </div>
  );
}

describe("상세 액션 메뉴", () => {
  it("열기·방향키 순환·Escape 복귀", () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    expect(screen.getByRole("menuitem", { name: "수정" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "ArrowUp" });
    expect(screen.getByRole("menuitem", { name: "삭제" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(screen.getByRole("menuitem", { name: "수정" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "메뉴" })).toHaveFocus();
  });
  it("Tab 이탈 시 메뉴 제거", () => {
    render(<Menu />);
    fireEvent.click(screen.getByRole("button", { name: "메뉴" }));
    fireEvent.keyDown(document.activeElement!, { key: "Tab" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
