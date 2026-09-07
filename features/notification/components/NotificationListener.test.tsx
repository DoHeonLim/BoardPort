/**
 * @vitest-environment jsdom
 */

/**
 * File Name : features/notification/components/NotificationListener.test.tsx
 * Description : 전역 알림 Realtime 정지 상태 복구 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.04  임도헌   Created   초기·화면 복귀 정지 재검증과 연결 오류 재구독 검증 추가
 */

import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ChannelStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  removeChannel: vi.fn(),
  subscribePrivate: vi.fn(),
  refreshSessionStatus: vi.fn(),
  redirectToBannedPage: vi.fn(),
  getUnreadCount: vi.fn(),
  increment: vi.fn(),
  setUnreadCount: vi.fn(),
  invalidateQueries: vi.fn(),
  refetchQueries: vi.fn(),
  statusCallback: undefined as ((status: ChannelStatus) => void) | undefined,
  broadcastHandlers: new Map<
    string,
    (message: { payload: Record<string, unknown> }) => void
  >(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  },
  subscribePrivateRealtimeChannel: mocks.subscribePrivate,
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mocks.invalidateQueries,
    refetchQueries: mocks.refetchQueries,
  }),
}));
vi.mock("@/components/global/providers/NotificationStoreProvider", () => ({
  useNotificationStore: (
    selector: (state: {
      increment: typeof mocks.increment;
      setUnreadCount: typeof mocks.setUnreadCount;
    }) => unknown
  ) =>
    selector({
      increment: mocks.increment,
      setUnreadCount: mocks.setUnreadCount,
    }),
}));
vi.mock("@/features/notification/actions/count", () => ({
  getUnreadNotificationCount: mocks.getUnreadCount,
}));
vi.mock("@/features/realtime/topics", () => ({
  notificationRealtimeTopic: (userId: number) =>
    `realtime:user:${userId}:notifications`,
}));
vi.mock("@/features/auth/utils/sessionStatus", () => ({
  refreshClientSessionStatus: mocks.refreshSessionStatus,
  redirectToBannedPage: mocks.redirectToBannedPage,
}));

import NotificationListener from "./NotificationListener";

function createChannel() {
  const channel = { on: vi.fn() };
  channel.on.mockImplementation(
    (
      _type: string,
      filter: { event?: string },
      handler: (message: { payload: Record<string, unknown> }) => void
    ) => {
      if (filter.event) mocks.broadcastHandlers.set(filter.event, handler);
      return channel;
    }
  );
  return channel;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.statusCallback = undefined;
  mocks.broadcastHandlers.clear();
  mocks.channel.mockImplementation(() => createChannel());
  mocks.removeChannel.mockResolvedValue(undefined);
  mocks.getUnreadCount.mockResolvedValue(0);
  mocks.refreshSessionStatus.mockResolvedValue({
    banned: false,
    bannedUntil: null,
  });
  mocks.subscribePrivate.mockImplementation(
    async (
      _channel: unknown,
      _signal: AbortSignal,
      onStatus?: (status: ChannelStatus) => void
    ) => {
      mocks.statusCallback = onStatus;
      onStatus?.("SUBSCRIBED");
      return true;
    }
  );
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: "visible",
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("NotificationListener", () => {
  it("최초 구독 시 DB 최신 정지 상태를 확인해 안내 화면으로 전환한다", async () => {
    mocks.refreshSessionStatus.mockResolvedValue({
      banned: true,
      bannedUntil: "2026-10-04T13:36:45.000Z",
    });

    render(<NotificationListener userId={203} />);

    await waitFor(() => {
      expect(mocks.redirectToBannedPage).toHaveBeenCalledOnce();
    });
    expect(mocks.channel).toHaveBeenCalledWith(
      "realtime:user:203:notifications",
      { config: { private: true } }
    );
  });

  it("최초 조회 중 채널 join이 완료되면 경합 구간 뒤 상태를 한 번 더 확인한다", async () => {
    let resolveInitialStatus:
      ((status: { banned: boolean; bannedUntil: null }) => void) | undefined;
    mocks.refreshSessionStatus
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveInitialStatus = resolve;
        })
      )
      .mockResolvedValue({ banned: false, bannedUntil: null });

    render(<NotificationListener userId={203} />);
    expect(mocks.refreshSessionStatus).toHaveBeenCalledOnce();

    await act(async () => {
      resolveInitialStatus?.({ banned: false, bannedUntil: null });
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(mocks.refreshSessionStatus).toHaveBeenCalledTimes(2);
    });
  });

  it("화면 복귀 시 놓친 정지 상태를 다시 확인한다", async () => {
    render(<NotificationListener userId={203} />);
    await waitFor(() => {
      expect(mocks.refreshSessionStatus).toHaveBeenCalled();
    });
    const initialCalls = mocks.refreshSessionStatus.mock.calls.length;
    mocks.refreshSessionStatus.mockResolvedValue({
      banned: true,
      bannedUntil: "2026-10-04T13:36:45.000Z",
    });

    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => {
      expect(mocks.refreshSessionStatus.mock.calls.length).toBeGreaterThan(
        initialCalls
      );
      expect(mocks.redirectToBannedPage).toHaveBeenCalledOnce();
    });
  });

  it("네트워크 복구 시 오프라인 동안 놓친 정지 상태를 확인한다", async () => {
    render(<NotificationListener userId={203} />);
    await waitFor(() => {
      expect(mocks.refreshSessionStatus).toHaveBeenCalled();
    });
    const initialCalls = mocks.refreshSessionStatus.mock.calls.length;

    window.dispatchEvent(new Event("online"));

    await waitFor(() => {
      expect(mocks.refreshSessionStatus.mock.calls.length).toBeGreaterThan(
        initialCalls
      );
    });
  });

  it("BAN broadcast를 받으면 서버 갱신 대기 없이 즉시 이동한다", async () => {
    render(<NotificationListener userId={203} />);
    await waitFor(() => {
      expect(mocks.broadcastHandlers.has("sys_event")).toBe(true);
    });

    act(() => {
      mocks.broadcastHandlers.get("sys_event")?.({
        payload: { type: "BAN", reason: "반복 거래 위반" },
      });
    });

    expect(mocks.redirectToBannedPage).toHaveBeenCalledWith("반복 거래 위반");
  });

  it("채널 오류 후 지수형 대기 첫 구간에서 재구독한다", async () => {
    vi.useFakeTimers();
    render(<NotificationListener userId={203} />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(mocks.channel).toHaveBeenCalledOnce();
    act(() => {
      mocks.statusCallback?.("CHANNEL_ERROR");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(mocks.channel).toHaveBeenCalledTimes(2);
    expect(mocks.removeChannel).toHaveBeenCalledOnce();
  });
});
