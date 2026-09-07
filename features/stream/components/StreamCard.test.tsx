/**
 * File Name : features/stream/components/StreamCard.test.tsx
 * Description : 팔로워 전용 방송 카드의 탐색과 팔로우 CTA 분리 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   카드 이동이 팔로우를 실행하지 않고 명시적 버튼만 관계를 변경하는지 검증
 */

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StreamCard from "./StreamCard";

const mocks = vi.hoisted(() => ({
  requestFollow: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/streams",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => <span role="img" aria-label={alt} />,
}));

vi.mock("@/components/global/UserAvatar", () => ({
  default: () => <span>testb</span>,
}));

describe("StreamCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("카드 탐색과 팔로우 요청을 서로 다른 인터랙션으로 제공한다", () => {
    render(
      <StreamCard
        id={230}
        title="SMOKE-V130-STREAM-FOLLOWERS"
        thumbnail={null}
        isLive
        streamer={{ username: "testb" }}
        visibility="FOLLOWERS"
        followersOnlyLocked
        onRequestFollow={mocks.requestFollow}
      />
    );

    const link = screen.getByRole("link", {
      name: /팔로워 전용 방송 상세보기/,
    });
    const followButton = screen.getByRole("button", { name: "팔로우하기" });

    expect(link).not.toContainElement(followButton);

    fireEvent.click(link);
    expect(mocks.requestFollow).not.toHaveBeenCalled();

    fireEvent.click(followButton);
    expect(mocks.requestFollow).toHaveBeenCalledTimes(1);
  });
});
