/**
 * File Name : app/(app)/streams/[id]/page.test.ts
 * Description : 제한 방송 metadata의 세션별 제목 노출 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   허용 사용자에게만 실제 방송 제목을 제공하는 정책 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMetadata } from "./page";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getCachedBroadcastDetail: vi.fn(),
  authorizeBroadcastAccess: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}));
vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/stream/service/detail", () => ({
  getBroadcastDetail: vi.fn(),
  getCachedBroadcastDetail: mocks.getCachedBroadcastDetail,
}));
vi.mock("@/features/stream/service/access", () => ({
  authorizeBroadcastAccess: mocks.authorizeBroadcastAccess,
}));
vi.mock("@/features/stream/service/playback", () => ({
  createStreamPlaybackToken: vi.fn(),
  resolveStreamThumbnailUrl: vi.fn(),
}));
vi.mock("@/features/stream/service/chat", () => ({
  getMutedStreamViewerIds: vi.fn(),
  getInitialStreamMessages: vi.fn(),
  getStreamChatRoom: vi.fn(),
  isStreamViewerMuted: vi.fn(),
}));
vi.mock("@/features/user/service/profile", () => ({
  getUserInfoById: vi.fn(),
  getUserProfile: vi.fn(),
}));
vi.mock("@/features/user/service/block", () => ({
  getBlockedUserIds: vi.fn(),
}));
vi.mock("@/features/stream/components/StreamDetailClientShell", () => ({
  default: vi.fn(),
}));
vi.mock("@/features/stream/components/StreamBlockGuard", () => ({
  default: vi.fn(),
}));

describe("stream generateMetadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedBroadcastDetail.mockResolvedValue({
      title: "SMOKE-V130-STREAM-FOLLOWERS",
      description: "팔로워 방송 설명",
      visibility: "FOLLOWERS",
      user: { username: "testb" },
    });
  });

  it("접근 가능한 팔로워에게 실제 방송 제목을 표시한다", async () => {
    mocks.getSession.mockResolvedValue({ id: 200 });
    mocks.authorizeBroadcastAccess.mockResolvedValue({ allowed: true });

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "230" }),
    });

    expect(metadata).toMatchObject({
      title: "SMOKE-V130-STREAM-FOLLOWERS - testb",
      description: "팔로워 방송 설명",
      robots: { index: false, follow: false },
    });
  });

  it("접근할 수 없는 사용자에게 실제 제목을 노출하지 않는다", async () => {
    mocks.getSession.mockResolvedValue({ id: 202 });
    mocks.authorizeBroadcastAccess.mockResolvedValue({ allowed: false });

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "230" }),
    });

    expect(metadata).toMatchObject({
      title: "팔로워 전용 방송",
      description: "방송 진행자를 팔로우하면 시청할 수 있습니다.",
      robots: { index: false, follow: false },
    });
    expect(metadata.title).not.toContain("SMOKE-V130");
  });

  it("비로그인 metadata 요청은 권한 조회 없이 비공개 제목을 감춘다", async () => {
    mocks.getCachedBroadcastDetail.mockResolvedValue({
      title: "PRIVATE SECRET TITLE",
      description: "비공개 설명",
      visibility: "PRIVATE",
      user: { username: "testb" },
    });
    mocks.getSession.mockResolvedValue(null);

    const metadata = await generateMetadata({
      params: Promise.resolve({ id: "231" }),
    });

    expect(metadata.title).toBe("비공개 방송");
    expect(mocks.authorizeBroadcastAccess).not.toHaveBeenCalled();
  });
});
