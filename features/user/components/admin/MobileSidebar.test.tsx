// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import MobileSidebar from "./MobileSidebar";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));
vi.mock("@/components/global/UserAvatar", () => ({ default: () => null }));
vi.mock("@/features/user/components/admin/AdminNavLink", () => ({
  default: ({ href, label }: { href: string; label: string }) => (
    <a href={href}>{label}</a>
  ),
}));
afterEach(() => vi.restoreAllMocks());

it("닫힌 메뉴 제외·배경 차단·Tab 순환·Escape 복귀", async () => {
  vi.spyOn(HTMLElement.prototype, "getClientRects").mockReturnValue([
    {},
  ] as unknown as DOMRectList);
  const { container } = render(<MobileSidebar user={{ username: "관리자" }} />);
  expect(
    screen.queryByRole("link", { name: "대시보드" })
  ).not.toBeInTheDocument();
  const trigger = screen.getByRole("button", { name: "관리자 메뉴 열기" });
  trigger.focus();
  fireEvent.click(trigger);
  const close = screen.getByRole("button", { name: "관리자 메뉴 닫기" });
  await waitFor(() => expect(close).toHaveFocus());
  expect(container.inert).toBe(true);
  fireEvent.keyDown(close, { key: "Tab", shiftKey: true });
  expect(screen.getByRole("link", { name: "서비스 홈으로" })).toHaveFocus();
  fireEvent.keyDown(document.activeElement!, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(container.inert).not.toBe(true);
  expect(trigger).toHaveFocus();
});
