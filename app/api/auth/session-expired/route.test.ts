/** 만료 쿠키 정리 후 로그인 복귀와 재로그인 경쟁 경계 검증 */
import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ getSession: vi.fn(), destroy: vi.fn() }));
vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
import { GET } from "./route";
beforeEach(() => vi.clearAllMocks());
it("무효 쿠키 삭제 후 캐시 없이 로그인 화면으로 복귀", async () => {
  mocks.getSession.mockResolvedValue({
    isInvalid: true,
    destroy: mocks.destroy,
  });
  const response = await GET(
    new NextRequest("https://boardport.test/api/auth/session-expired")
  );
  expect(mocks.destroy).toHaveBeenCalledOnce();
  expect(response.headers.get("location")).toBe("https://boardport.test/login");
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("늦게 도착한 만료 복구 요청은 새 유효 세션 보존", async () => {
  mocks.getSession.mockResolvedValue({ id: 22, destroy: mocks.destroy });
  const response = await GET(
    new NextRequest("https://boardport.test/api/auth/session-expired")
  );
  expect(mocks.destroy).not.toHaveBeenCalled();
  expect(response.headers.get("location")).toBe(
    "https://boardport.test/products"
  );
});
