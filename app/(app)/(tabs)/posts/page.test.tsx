/**
 * File Name : app/(app)/(tabs)/posts/page.test.tsx
 * Description : 게시글 초기 조회의 인증 경계와 독립 요청 대기 검증
 *
 * History
 * 2026.09.10 Created 알림 지연과 무관한 목록 조회 시작 및 완성 화면 계약 검증
 */

import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  location: vi.fn(),
  notifications: vi.fn(),
  posts: vi.fn(),
  queryClient: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ default: mocks.session }));
vi.mock("@/lib/getQueryClient", () => ({ getQueryClient: mocks.queryClient }));
vi.mock("@/features/user/service/profile", () => ({
  getUserLocation: mocks.location,
}));
vi.mock("@/features/notification/service/notification", () => ({
  getUnreadNotificationCountOrZero: mocks.notifications,
}));
vi.mock("@/features/post/service/post", () => ({ getPostsList: mocks.posts }));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));
vi.mock("@/components/global/PullToRefresh", () => ({ default: () => null }));
vi.mock("@/features/post/components/PostList", () => ({ default: () => null }));
vi.mock("@/features/post/components/PostMobileHeader", () => ({
  default: () => null,
}));
vi.mock("@/features/post/components/PostDesktopHeader", () => ({
  default: () => null,
}));
vi.mock("@/features/post/components/PostEmptyState", () => ({
  default: () => null,
}));
vi.mock("@/features/post/components/PostLocalRangeHint", () => ({
  default: () => null,
}));
vi.mock("@/features/post/components/AddPostButton", () => ({
  default: () => null,
}));
vi.mock("@/features/post/components/PostListSkeleton", () => ({
  default: () => null,
}));
vi.mock("@/features/post/components/PostListRefreshRelay", () => ({
  default: () => null,
}));
vi.mock("@/features/post/components/PostSortSelect", () => ({
  default: () => null,
}));

import PostsPage from "./page";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const location = {
  region1: "서울특별시",
  region2: "강남구",
  region3: "역삼동",
  regionRange: "GU",
};
const posts = { posts: [], nextCursor: null, totalCount: 0 };

describe("게시글 초기 조회", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.session.mockResolvedValue({ id: 17 });
    mocks.queryClient.mockReturnValue(
      new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      })
    );
  });

  it("인증되지 않은 요청은 알림·지역·목록 조회 전에 로그인으로 이동", async () => {
    mocks.session.mockResolvedValue(null);
    await expect(
      PostsPage({ searchParams: Promise.resolve({}) })
    ).rejects.toThrow("REDIRECT:/login?callbackUrl=/posts");
    expect(mocks.notifications).not.toHaveBeenCalled();
    expect(mocks.location).not.toHaveBeenCalled();
    expect(mocks.posts).not.toHaveBeenCalled();
  });

  it.each(["notifications", "posts"] as const)(
    "지역 준비 후 알림과 목록을 중첩하고 %s 완료만으로 화면을 반환하지 않는 계약",
    async (first) => {
      const locationGate = deferred<typeof location>();
      const notificationGate = deferred<number>();
      const postsGate = deferred<typeof posts>();
      mocks.location.mockReturnValue(locationGate.promise);
      mocks.notifications.mockReturnValue(notificationGate.promise);
      mocks.posts.mockReturnValue(postsGate.promise);
      let finished = false;
      const result = PostsPage({
        searchParams: Promise.resolve({ sort: "latest" }),
      }).then((page) => {
        finished = true;
        return page;
      });
      try {
        await vi.waitFor(() => expect(mocks.location).toHaveBeenCalledWith(17));
        expect(mocks.notifications).toHaveBeenCalledWith(17);
        expect(mocks.posts).not.toHaveBeenCalled();
        locationGate.resolve(location);
        // 알림을 미완료 상태로 유지한 채 실제 목록 service 호출 시작 확인
        await vi.waitFor(() =>
          expect(mocks.posts).toHaveBeenCalledWith(
            expect.objectContaining({ sort: "latest" }),
            17,
            null
          )
        );
        expect(finished).toBe(false);
        if (first === "notifications") notificationGate.resolve(2);
        else postsGate.resolve(posts);
        // 첫 응답의 Promise chain 처리 후에도 나머지 조회 대기 유지
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        expect(finished).toBe(false);
        notificationGate.resolve(2);
        postsGate.resolve(posts);
        await result;
        expect(finished).toBe(true);
      } finally {
        locationGate.resolve(location);
        notificationGate.resolve(2);
        postsGate.resolve(posts);
        await result;
      }
    }
  );
});
