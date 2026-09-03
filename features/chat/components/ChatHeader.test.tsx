/**
 * File Name : features/chat/components/ChatHeader.test.tsx
 * Description : 채팅 헤더 상품 상태 동기화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   RSC refresh 뒤 예약 상태가 판매자 메뉴에 반영되는지 검증
 */

// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ChatHeader from "./ChatHeader";
import type { ChatHeaderProduct } from "@/features/chat/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("next/image", () => ({
  default: ({ alt = "" }: { alt?: string }) => (
    <span role="img" aria-label={alt} />
  ),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/hooks/useIsMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/components/global/UserAvatar", () => ({
  default: () => <span>avatar</span>,
}));

vi.mock("@/components/global/BackButton", () => ({
  default: () => <button type="button">뒤로가기</button>,
}));

vi.mock("@/components/global/BottomSheet", () => ({
  default: () => null,
}));

vi.mock("@/components/global/ConfirmDialog", () => ({
  default: () => null,
}));

vi.mock("@/features/chat/actions/room", () => ({
  leaveChatRoomAction: vi.fn(),
}));

vi.mock("@/features/product/actions/status", () => ({
  updateProductStatusAction: vi.fn(),
}));

vi.mock("@/features/user/actions/block", () => ({
  toggleBlockAction: vi.fn(),
}));

const sellingProduct: ChatHeaderProduct = {
  id: 572,
  title: "SMOKE-V130-TRADE-COMPLETE",
  images: [],
  price: 22_000,
  userId: 201,
  reservation_userId: null,
  purchase_userId: null,
};

const baseProps = {
  chatRoomId: "room-trade-complete",
  viewerId: 201,
  counterparty: { id: 200, username: "testa", hasLeft: false },
  returnTo: "/products",
  searchOpen: false,
  searchQuery: "",
  searchResultCount: 0,
  searchCurrentIndex: 0,
  searchCanGoPrev: false,
  searchCanGoNext: false,
  onSearchOpen: vi.fn(),
  onSearchClose: vi.fn(),
  onSearchChange: vi.fn(),
  onSearchNext: vi.fn(),
  onSearchPrev: vi.fn(),
};

describe("ChatHeader", () => {
  it("새 product prop의 예약 상태로 판매자 메뉴를 다시 계산한다", async () => {
    const { rerender } = render(
      <ChatHeader {...baseProps} product={sellingProduct} />
    );

    fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
    expect(
      screen.getByRole("menuitem", { name: "예약자로 지정" })
    ).toBeInTheDocument();

    rerender(
      <ChatHeader
        {...baseProps}
        product={{ ...sellingProduct, reservation_userId: 200 }}
      />
    );

    await waitFor(() => {
      expect(
        screen.queryByRole("menuitem", { name: "예약자로 지정" })
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: "예약 취소 (판매중)" })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("menuitem", { name: "판매완료 처리" })
      ).toBeInTheDocument();
    });
  });
});
