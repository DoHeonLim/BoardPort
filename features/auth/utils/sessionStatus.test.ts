/**
 * @vitest-environment jsdom
 */

/**
 * File Name : features/auth/utils/sessionStatus.test.ts
 * Description : 브라우저 세션 정지 상태 동기화 유틸리티 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.04  임도헌   Created   세션 갱신 응답 검증과 정지 안내 URL 생성 검증 추가
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBannedRedirectHref,
  refreshClientSessionStatus,
} from "./sessionStatus";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("refreshClientSessionStatus", () => {
  it("캐시 없이 서버 세션을 갱신하고 정지 상태를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          ok: true,
          banned: true,
          bannedUntil: "2026-10-04T13:36:45.000Z",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(refreshClientSessionStatus()).resolves.toEqual({
      banned: true,
      bannedUntil: "2026-10-04T13:36:45.000Z",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
      })
    );
  });

  it("실패 응답과 유효하지 않은 응답은 상태 미확인으로 반환한다", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(refreshClientSessionStatus()).resolves.toBeNull();
    await expect(refreshClientSessionStatus()).resolves.toBeNull();
  });
});

describe("buildBannedRedirectHref", () => {
  it("정지 안내 사유와 운영 사유를 내부 URL에 인코딩한다", () => {
    const href = new URL(buildBannedRedirectHref(" 반복 거래 위반 "));

    expect(href.pathname).toBe("/403");
    expect(href.searchParams.get("reason")).toBe("BANNED");
    expect(href.searchParams.get("banReason")).toBe("반복 거래 위반");
  });
});
