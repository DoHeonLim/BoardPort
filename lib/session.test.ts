/**
 * File Name : lib/session.test.ts
 * Description : 사용자 세션 버전 폐기 경계 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   DB sessionVersion 일치·불일치 세션 검증
 * 2026.09.09  임도헌   Modified  요청 단위 읽기 캐시와 갱신 세션 비캐시 계약 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getIronSession: vi.fn(),
  cookies: vi.fn(),
  findUnique: vi.fn(),
  destroy: vi.fn(),
  cache: vi.fn(<T extends (...args: never[]) => unknown>(callback: T): T => {
    let result: ReturnType<T> | undefined;
    let initialized = false;

    return ((...args: Parameters<T>) => {
      if (!initialized) {
        result = callback(...args) as ReturnType<T>;
        initialized = true;
      }
      return result;
    }) as T;
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: mocks.cache }));
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
    vi.resetModules();
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

  it("같은 요청의 반복 조회는 암호화 세션과 DB 검증 결과를 재사용한다", async () => {
    const session = { id: 7, sessionVersion: 3, destroy: mocks.destroy };
    mocks.getIronSession.mockResolvedValue(session);
    mocks.findUnique.mockResolvedValue({ sessionVersion: 3 });
    const { default: getSession } = await import("./session");

    const [first, second] = await Promise.all([getSession(), getSession()]);

    expect(first).toBe(session);
    expect(second).toBe(session);
    expect(mocks.getIronSession).toHaveBeenCalledOnce();
    expect(mocks.findUnique).toHaveBeenCalledOnce();
  });

  it("세션 버전이 다르면 쿠키 쓰기 없이 요청 권한을 폐기한다", async () => {
    const session = { id: 7, sessionVersion: 2, destroy: mocks.destroy };
    mocks.getIronSession.mockResolvedValue(session);
    mocks.findUnique.mockResolvedValue({ sessionVersion: 3 });
    const { default: getSession } = await import("./session");

    await getSession();
    expect(mocks.destroy).not.toHaveBeenCalled();
    expect(session).not.toHaveProperty("id");
    expect(session).toHaveProperty("isInvalid", true);
  });

  it("재발급용 세션 조회는 DB 버전 검증 전에 쿠키 객체를 반환한다", async () => {
    const session = { id: 7, sessionVersion: 2, destroy: mocks.destroy };
    mocks.getIronSession.mockResolvedValue(session);
    const { getSessionForUpdate } = await import("./session");

    await expect(getSessionForUpdate()).resolves.toBe(session);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(mocks.destroy).not.toHaveBeenCalled();
  });

  it("재발급용 세션 조회는 요청 캐시를 사용하지 않는다", async () => {
    const firstSession = { id: 7, sessionVersion: 2 };
    const secondSession = { id: 7, sessionVersion: 3 };
    mocks.getIronSession
      .mockResolvedValueOnce(firstSession)
      .mockResolvedValueOnce(secondSession);
    const { getSessionForUpdate } = await import("./session");

    await expect(getSessionForUpdate()).resolves.toBe(firstSession);
    await expect(getSessionForUpdate()).resolves.toBe(secondSession);
    expect(mocks.getIronSession).toHaveBeenCalledTimes(2);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
