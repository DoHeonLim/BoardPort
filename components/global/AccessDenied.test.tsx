/**
 * File Name : components/global/AccessDenied.test.tsx
 * Description : 접근 제한 사유별 안내 제목과 팔로우 복귀 동작 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   FOLLOWERS/PRIVATE 안내 문구와 팔로우 후 상세 복귀 검증
 */

// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AccessDenied from "./AccessDenied";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  toggle: vi.fn(),
  isPending: vi.fn(() => false),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/features/user/hooks/useFollowToggle", () => ({
  useFollowToggle: () => ({
    toggle: mocks.toggle,
    isPending: mocks.isPending,
  }),
}));

vi.mock("@/components/global/LogoutButton", () => ({
  default: () => <button type="button">로그아웃</button>,
}));

describe("AccessDenied", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["FOLLOWERS_ONLY", "팔로우 후 시청할 수 있어요"],
    ["PRIVATE", "비밀번호가 필요한 방송입니다"],
    ["BLOCKED", "접근할 수 없습니다"],
  ] as const)("%s 사유에 맞는 제목을 표시한다", (reason, title) => {
    render(
      <AccessDenied
        reason={reason}
        username="testb"
        callbackUrl="/streams/230"
        streamId={230}
        ownerId={201}
        viewerId={202}
      />
    );

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
  });

  it("팔로우 성공 후 제한 화면을 남기지 않고 방송 상세로 복귀한다", async () => {
    mocks.toggle.mockResolvedValue({ success: true, isFollowing: true });

    render(
      <AccessDenied
        reason="FOLLOWERS_ONLY"
        username="testb"
        callbackUrl="/streams/230"
        ownerId={201}
        viewerId={202}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "팔로우 후 입장" }));

    await waitFor(() => {
      expect(mocks.toggle).toHaveBeenCalledWith(
        201,
        false,
        expect.objectContaining({ viewerId: 202, refresh: false })
      );
      expect(mocks.replace).toHaveBeenCalledWith("/streams/230");
    });
  });
});
