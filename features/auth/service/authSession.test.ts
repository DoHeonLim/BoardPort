/**
 * File Name : features/auth/service/authSession.test.ts
 * Description : 로그인 세션 발급 정보 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   최신 role·ban·sessionVersion 저장 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionForUpdate: vi.fn(),
  findUnique: vi.fn(),
  save: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({
  default: vi.fn(),
  getSessionForUpdate: mocks.getSessionForUpdate,
}));
vi.mock("@/lib/db", () => ({
  default: { user: { findUnique: mocks.findUnique } },
}));

describe("saveUserSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionForUpdate.mockResolvedValue({ save: mocks.save });
    mocks.findUnique.mockResolvedValue({
      role: "USER",
      bannedAt: null,
      sessionVersion: 4,
    });
  });

  it("DB의 최신 sessionVersion을 암호화 쿠키에 저장한다", async () => {
    const { saveUserSession } = await import("./authSession");
    const session = await mocks.getSessionForUpdate();

    await saveUserSession(7);

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { role: true, bannedAt: true, sessionVersion: true },
    });
    expect(session).toMatchObject({
      id: 7,
      role: "USER",
      banned: false,
      sessionVersion: 4,
    });
    expect(mocks.save).toHaveBeenCalledTimes(1);
  });
});
