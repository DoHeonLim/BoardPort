/**
 * File Name : features/user/actions/withdraw.test.ts
 * Description : 회원 탈퇴 세션 종료 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   탈퇴 성공·실패별 세션 파기 경계 테스트 추가
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  withdrawUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", () => ({
  default: mocks.getSession,
}));

vi.mock("@/features/user/service/withdraw", () => ({
  withdrawUser: mocks.withdrawUser,
}));

describe("withdrawAction", () => {
  const destroy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 7, destroy });
    mocks.withdrawUser.mockResolvedValue({ success: true });
  });

  it("로그인하지 않은 사용자는 탈퇴 서비스와 세션 파기를 호출하지 않는다", async () => {
    mocks.getSession.mockResolvedValue({});
    const { withdrawAction } = await import("./withdraw");

    const result = await withdrawAction();

    expect(result).toEqual({
      success: false,
      error: "로그인이 필요합니다.",
    });
    expect(mocks.withdrawUser).not.toHaveBeenCalled();
    expect(destroy).not.toHaveBeenCalled();
  });

  it("탈퇴 서비스가 실패하면 세션을 유지한다", async () => {
    const failure = {
      success: false,
      error: "회원 탈퇴 처리에 실패했습니다.",
    } as const;
    mocks.withdrawUser.mockResolvedValue(failure);
    const { withdrawAction } = await import("./withdraw");

    const result = await withdrawAction();

    expect(result).toEqual(failure);
    expect(mocks.withdrawUser).toHaveBeenCalledWith(7);
    expect(destroy).not.toHaveBeenCalled();
  });

  it("탈퇴 성공 시 세션을 파기하고 클라이언트 후처리용 성공 결과를 반환한다", async () => {
    const { withdrawAction } = await import("./withdraw");

    const result = await withdrawAction();

    expect(mocks.withdrawUser).toHaveBeenCalledWith(7);
    expect(destroy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });
});
