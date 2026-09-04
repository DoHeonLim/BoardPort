/**
 * File Name : app/api/auth/refresh/route.test.ts
 * Description : 세션 권한·정지 상태 갱신 API 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.04  임도헌   Created   유효 정지·만료 정지·미인증 응답 검증 추가
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: {
    id: undefined as number | undefined,
    role: undefined as "USER" | "ADMIN" | undefined,
    banned: undefined as boolean | undefined,
    save: vi.fn(),
    destroy: vi.fn(),
  },
  findUnique: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  default: vi.fn(async () => mocks.session),
}));
vi.mock("@/lib/db", () => ({
  default: { user: { findUnique: mocks.findUnique } },
}));

import { POST } from "./route";

beforeEach(() => {
  mocks.session.id = undefined;
  mocks.session.role = undefined;
  mocks.session.banned = undefined;
  mocks.session.save.mockReset();
  mocks.session.destroy.mockReset();
  mocks.findUnique.mockReset();
});

describe("POST /api/auth/refresh", () => {
  it("로그인 세션이 없으면 DB 조회 없이 401을 반환한다", async () => {
    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("현재 유효한 정지를 세션과 응답에 함께 반영한다", async () => {
    const bannedUntil = new Date("9999-12-31T23:59:59.000Z");
    mocks.session.id = 203;
    mocks.findUnique.mockResolvedValue({
      role: "USER",
      bannedAt: new Date("2026-09-04T12:00:00.000Z"),
      bannedUntil,
    });

    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.session.role).toBe("USER");
    expect(mocks.session.banned).toBe(true);
    expect(mocks.session.save).toHaveBeenCalledOnce();
    await expect(response.json()).resolves.toEqual({
      ok: true,
      banned: true,
      bannedUntil: bannedUntil.toISOString(),
    });
  });

  it("만료된 정지는 현재 세션에서 비활성 상태로 보정한다", async () => {
    mocks.session.id = 203;
    mocks.findUnique.mockResolvedValue({
      role: "USER",
      bannedAt: new Date("2020-01-01T00:00:00.000Z"),
      bannedUntil: new Date("2020-01-02T00:00:00.000Z"),
    });

    const response = await POST();

    expect(mocks.session.banned).toBe(false);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      banned: false,
      bannedUntil: null,
    });
  });

  it("삭제된 사용자의 세션을 폐기하고 401을 반환한다", async () => {
    mocks.session.id = 203;
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST();

    expect(response.status).toBe(401);
    expect(mocks.session.destroy).toHaveBeenCalledOnce();
  });
});
