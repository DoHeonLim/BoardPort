/**
 * File Name : features/notification/service/notificationCount.test.ts
 * Description : 미읽음 알림 개수 fail-soft 조회 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.09  임도헌   Created   정상 개수 반환과 보조 UI용 DB 오류 복구 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  count: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    notification: { count: mocks.count },
  },
}));
vi.mock("@/features/realtime/service/broadcast", () => ({
  realtimeServer: {},
}));
vi.mock("@/features/notification/service/sender", () => ({
  sendPushNotification: vi.fn(),
}));

import {
  getUnreadNotificationCountByUser,
  getUnreadNotificationCountOrZero,
} from "./notification";

describe("미읽음 알림 개수 조회", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("사용자별 미읽음 알림 개수를 반환한다", async () => {
    mocks.count.mockResolvedValue(4);

    await expect(getUnreadNotificationCountByUser(17)).resolves.toBe(4);
    expect(mocks.count).toHaveBeenCalledWith({
      where: { userId: 17, isRead: false },
    });
  });

  it("보조 UI 조회 실패는 0으로 복구한다", async () => {
    const error = new Error("DB unavailable");
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.count.mockRejectedValue(error);

    await expect(getUnreadNotificationCountOrZero(17)).resolves.toBe(0);
    expect(consoleError).toHaveBeenCalledWith(
      "Failed to fetch unread notification count:",
      error
    );

    consoleError.mockRestore();
  });
});
