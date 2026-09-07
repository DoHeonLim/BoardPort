/**
 * File Name : features/auth/actions/logout.test.ts
 * Description : 현재 기기 Push 구독 정리를 포함한 로그아웃 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   Push 구독 검증·정리와 세션 파기 순서 테스트 추가
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  unsubscribeDevice: vi.fn(),
  destroyAuthSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", () => ({
  default: mocks.getSession,
}));

vi.mock("@/features/notification/service/subscription", () => ({
  unsubscribeDevice: mocks.unsubscribeDevice,
}));

vi.mock("@/features/auth/service/logout", async (importOriginal) => {
  const original = await importOriginal<
    typeof import("@/features/auth/service/logout")
  >();

  mocks.destroyAuthSession.mockImplementation(original.destroyAuthSession);

  return {
    ...original,
    destroyAuthSession: mocks.destroyAuthSession,
  };
});

describe("logOut", () => {
  const deviceSubscription = {
    endpoint: "https://fcm.googleapis.com/fcm/send/current-device",
    keys: {
      p256dh:
        "BAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE",
      auth: "AgICAgICAgICAgICAgICAg",
    },
  };

  const destroy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 7, destroy });
    mocks.unsubscribeDevice.mockResolvedValue(undefined);
  });

  it("현재 기기 구독이 없으면 세션을 바로 파기한다", async () => {
    const { logOut } = await import("./logout");

    const result = await logOut(null);

    expect(result).toEqual({ success: true });
    expect(mocks.destroyAuthSession).toHaveBeenCalledWith(null);
    expect(mocks.getSession).toHaveBeenCalledTimes(1);
    expect(mocks.unsubscribeDevice).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it("유효한 현재 기기 구독을 정리한 뒤 세션을 파기한다", async () => {
    const { logOut } = await import("./logout");
    const callOrder: string[] = [];

    mocks.unsubscribeDevice.mockImplementation(async () => {
      callOrder.push("unsubscribe");
    });
    destroy.mockImplementation(() => {
      callOrder.push("destroy");
    });

    const result = await logOut(deviceSubscription);

    expect(result).toEqual({ success: true });
    expect(mocks.destroyAuthSession).toHaveBeenCalledWith(deviceSubscription);
    expect(mocks.unsubscribeDevice).toHaveBeenCalledWith(7, deviceSubscription);
    expect(callOrder).toEqual(["unsubscribe", "destroy"]);
  });

  it("유효하지 않은 구독 payload이면 서비스와 세션 파기를 호출하지 않는다", async () => {
    const { logOut } = await import("./logout");

    const result = await logOut({
      endpoint: "http://push.example.com/subscriptions/current-device",
      keys: deviceSubscription.keys,
    });

    expect(result).toEqual({
      success: false,
      error: "이 기기의 알림 연결 정보를 확인하지 못했습니다.",
    });
    expect(mocks.destroyAuthSession).not.toHaveBeenCalled();
    expect(mocks.getSession).not.toHaveBeenCalled();
    expect(mocks.unsubscribeDevice).not.toHaveBeenCalled();
    expect(destroy).not.toHaveBeenCalled();
  });

  it("현재 기기 구독 정리에 실패하면 실패를 반환하고 세션을 유지한다", async () => {
    const { logOut } = await import("./logout");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.unsubscribeDevice.mockRejectedValue(new Error("database unavailable"));

    const result = await logOut(deviceSubscription);

    expect(result).toEqual({
      success: false,
      error: "로그아웃 처리 중 오류가 발생했습니다.",
    });
    expect(mocks.unsubscribeDevice).toHaveBeenCalledWith(7, deviceSubscription);
    expect(destroy).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "[logout] failed:",
      expect.any(Error)
    );

    consoleError.mockRestore();
  });
});
