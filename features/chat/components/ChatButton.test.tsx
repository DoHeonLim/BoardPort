/**
 * File Name : features/chat/components/ChatButton.test.tsx
 * Description : 채팅 버튼의 성공 라우팅과 비즈니스 오류 토스트 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.01  임도헌   Created   반환 경로 이동과 실제 Action 오류 안내를 분리하는 동작 검증
 */

// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChatButton from "./ChatButton";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  createChatRoomAction: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => "/products/view/525",
  useSearchParams: () => new URLSearchParams("view=grid"),
}));
vi.mock("@/features/product/actions/chat", () => ({
  createChatRoomAction: mocks.createChatRoomAction,
}));
vi.mock("sonner", () => ({
  toast: { error: mocks.toastError },
}));

describe("ChatButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createChatRoomAction.mockResolvedValue(
      "/chats/room-525-7?returnTo=%2Fproducts%2Fview%2F525%3Fview%3Dgrid"
    );
  });

  it("서버 액션이 반환한 채팅 경로로 이동하고 오류 토스트를 표시하지 않는다", async () => {
    render(<ChatButton productId={525} />);

    fireEvent.click(screen.getByRole("button", { name: "채팅으로 거래하기" }));

    await waitFor(() => {
      expect(mocks.push).toHaveBeenCalledWith(
        "/chats/room-525-7?returnTo=%2Fproducts%2Fview%2F525%3Fview%3Dgrid"
      );
    });
    expect(mocks.createChatRoomAction).toHaveBeenCalledWith(
      525,
      "/products/view/525?view=grid"
    );
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it("실제 비즈니스 오류만 토스트로 안내하고 이동하지 않는다", async () => {
    mocks.createChatRoomAction.mockRejectedValue(
      new Error("차단된 사용자와는 대화할 수 없습니다.")
    );
    render(<ChatButton productId={525} />);

    fireEvent.click(screen.getByRole("button", { name: "채팅으로 거래하기" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith(
        "차단된 사용자와는 대화할 수 없습니다."
      );
    });
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
