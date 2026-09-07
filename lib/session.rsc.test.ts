/** 실제 iron-session과 Next.js 읽기 전용 쿠키로 서버 렌더링 경계 검증 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sealData } from "iron-session";
import { RequestCookiesAdapter } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { RequestCookies } from "next/dist/server/web/spec-extension/cookies";
const mocks = vi.hoisted(() => ({ cookies: vi.fn(), findUnique: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("@/lib/db", () => ({
  default: { user: { findUnique: mocks.findUnique } },
}));
vi.mock("@/lib/env", () => ({ getCookiePassword: () => "a".repeat(32) }));
import getSession from "./session";

beforeEach(async () => {
  const sealed = await sealData(
    {
      id: 7,
      role: "ADMIN",
      sessionVersion: 2,
      unlockedBroadcastIds: { "12": true },
    },
    { password: "a".repeat(32) }
  );
  mocks.cookies.mockResolvedValue(
    RequestCookiesAdapter.seal(
      new RequestCookies(new Headers({ cookie: `user=${sealed}` }))
    )
  );
});
describe("RSC 세션 무효화", () => {
  it.each([null, { sessionVersion: 3 }])(
    "삭제된 사용자 또는 만료 버전을 비로그인으로 반환: %j",
    async (user) => {
      mocks.findUnique.mockResolvedValue(user);
      const session = await getSession();
      expect(session.isInvalid).toBe(true);
      expect(session.id).toBeUndefined();
      expect(session.role).toBeUndefined();
      expect(session.unlockedBroadcastIds).toBeUndefined();
      expect(JSON.stringify(session)).toBe("{}");
    }
  );
  it("DB 장애를 세션 만료로 바꾸지 않음", async () => {
    mocks.findUnique.mockRejectedValue(new Error("database unavailable"));
    await expect(getSession()).rejects.toThrow("database unavailable");
  });
});
