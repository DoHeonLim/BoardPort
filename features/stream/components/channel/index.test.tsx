/**
 * File Name : features/stream/components/channel/index.test.tsx
 * Description : 방송국 팔로워 전용 CTA의 직접 팔로우와 서버 재조회 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   팔로우 성공 후 signed 재생 정보 갱신과 즉시 잠금 해제 검증
 */

// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserChannelContainer from "./index";

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  toggle: vi.fn(),
  isPending: vi.fn(() => false),
  success: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  usePathname: () => "/profile/testb/channel",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: { success: mocks.success },
}));

vi.mock("@/features/user/hooks/useFollowToggle", () => ({
  useFollowToggle: () => ({
    toggle: mocks.toggle,
    isPending: mocks.isPending,
  }),
}));

vi.mock("@/features/stream/components/channel/UserChannelHeader", () => ({
  default: () => <div>채널 헤더</div>,
}));

vi.mock("@/features/stream/components/channel/LiveNowHero", () => ({
  default: ({ onFollow }: { onFollow?: () => void }) => (
    <button type="button" onClick={onFollow}>
      팔로우하고 시청하기
    </button>
  ),
}));

vi.mock("@/features/stream/components/channel/RecordingGrid", () => ({
  default: () => <div>다시보기</div>,
}));

describe("UserChannelContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("팔로우 성공 후 서버에서 signed 재생 정보를 다시 조회한다", async () => {
    mocks.toggle.mockResolvedValue({ success: true, isFollowing: true });

    render(
      <UserChannelContainer
        userInfo={{
          id: 201,
          username: "testb",
          isFollowing: false,
          _count: { followers: 0, following: 0 },
        }}
        me={false}
        viewerId={202}
      />
    );

    fireEvent.click(
      screen.getByRole("button", { name: "팔로우하고 시청하기" })
    );

    await waitFor(() => {
      expect(mocks.toggle).toHaveBeenCalledWith(201, false, { viewerId: 202 });
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
      expect(mocks.success).toHaveBeenCalledWith("testb님을 팔로우했습니다.");
    });
  });
});
