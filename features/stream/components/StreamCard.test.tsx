/**
 * File Name : features/stream/components/StreamCard.test.tsx
 * Description : 방송 카드의 탐색·활동 시각·팔로우 CTA 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   카드 이동이 팔로우를 실행하지 않고 명시적 버튼만 관계를 변경하는지 검증
 * 2026.09.11  임도헌   Modified  관심 목록에서 찜한 시각을 우선 표시하는지 검증
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

  it("관심 목록에서는 콘텐츠 생성 시각보다 찜한 시각을 우선 표시한다", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T12:00:00.000Z"));

    render(
      <StreamCard
        id={231}
        title="관심 목록 다시보기"
        thumbnail={null}
        isLive={false}
        streamer={{ username: "testb" }}
        startedAt="2026-09-01T12:00:00.000Z"
        activityAt="2026-09-11T11:55:00.000Z"
        activityLabel="찜"
      />
    );

    expect(screen.getByText(/찜 5분 전/)).toBeInTheDocument();
    expect(screen.queryByText(/1주일 전/)).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
