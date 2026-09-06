/**
 * File Name : lib/session.test.ts
 * Description : 사용자 세션 버전 폐기 경계 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   DB sessionVersion 일치·불일치 세션 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getIronSession: vi.fn(),
  cookies: vi.fn(),
  findUnique: vi.fn(),
  destroy: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("iron-session", () => ({ getIronSession: mocks.getIronSession }));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/db", () => ({
  default: { user: { findUnique: mocks.findUnique } },
}));
vi.mock("@/lib/env", () => ({
  getCookiePassword: () => "a".repeat(32),
}));

describe("getSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.cookies.mockReturnValue({});
  });

  it("비로그인 쿠키는 DB 조회 없이 반환한다", async () => {
    const session = { destroy: mocks.destroy };
    mocks.getIronSession.mockResolvedValue(session);
    const { default: getSession } = await import("./session");

    await expect(getSession()).resolves.toBe(session);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("세션 버전이 DB와 일치하면 로그인 상태를 유지한다", async () => {
    const session = { id: 7, sessionVersion: 3, destroy: mocks.destroy };
    mocks.getIronSession.mockResolvedValue(session);
    mocks.findUnique.mockResolvedValue({ sessionVersion: 3 });
    const { default: getSession } = await import("./session");

    await expect(getSession()).resolves.toBe(session);
    expect(mocks.destroy).not.toHaveBeenCalled();
  });

  it("사용자가 없거나 세션 버전이 다르면 기존 쿠키를 폐기한다", async () => {
    const session = { id: 7, sessionVersion: 2, destroy: mocks.destroy };
    mocks.getIronSession.mockResolvedValue(session);
    mocks.findUnique.mockResolvedValue({ sessionVersion: 3 });
    const { default: getSession } = await import("./session");

    await getSession();
    expect(mocks.destroy).toHaveBeenCalledTimes(1);
  });

  it("재발급용 세션 조회는 DB 버전 검증 전에 쿠키 객체를 반환한다", async () => {
    const session = { id: 7, sessionVersion: 2, destroy: mocks.destroy };
    mocks.getIronSession.mockResolvedValue(session);
    const { getSessionForUpdate } = await import("./session");

    await expect(getSessionForUpdate()).resolves.toBe(session);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.destroy).not.toHaveBeenCalled();
  });
});
