/**
 * File Name : lib/media/safeImageFetch.test.ts
 * Description : OG 원격 이미지 조회 보안 경계 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.22  임도헌   Created   사설 IP·redirect·크기·content-type·정상 이미지 경계 검증
 * 2026.09.01  임도헌   Modified  서버 변환 호환 이미지 형식 우선 요청 검증
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ lookup: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("node:dns/promises", () => ({ lookup: mocks.lookup }));

describe("fetchSafeOgImage", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("loopback 또는 사설 주소로 해석되면 요청하지 않는다", async () => {
    mocks.lookup.mockResolvedValue([{ address: "127.0.0.1", family: 4 }]);
    const { fetchSafeOgImage } = await import("./safeImageFetch");

    await expect(
      fetchSafeOgImage("https://imagedelivery.net/hash/asset/public")
    ).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("IPv4 private와 IPv6 link-local 범위를 명시적으로 판별한다", async () => {
    const { isPrivateIpAddress } = await import("./safeImageFetch");

    expect(isPrivateIpAddress("10.0.0.1")).toBe(true);
    expect(isPrivateIpAddress("169.254.1.1")).toBe(true);
    expect(isPrivateIpAddress("fe80::1")).toBe(true);
    expect(isPrivateIpAddress("2606:4700::1111")).toBe(false);
  });

  it("허용 host에서 비허용 host로 redirect되면 후속 요청을 차단한다", async () => {
    mocks.lookup.mockResolvedValue([{ address: "104.16.1.1", family: 4 }]);
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: { location: "https://127.0.0.1/internal.png" },
      })
    );
    const { fetchSafeOgImage } = await import("./safeImageFetch");

    await expect(
      fetchSafeOgImage("https://imagedelivery.net/hash/asset/public")
    ).resolves.toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("이미지가 아닌 응답과 제한보다 큰 응답은 거부한다", async () => {
    mocks.lookup.mockResolvedValue([{ address: "104.16.1.1", family: 4 }]);
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        new Response("html", { headers: { "content-type": "text/html" } })
      )
      .mockResolvedValueOnce(
        new Response("x", {
          headers: {
            "content-type": "image/png",
            "content-length": String(6 * 1024 * 1024),
          },
        })
      );
    const { fetchSafeOgImage } = await import("./safeImageFetch");
    const url = "https://imagedelivery.net/hash/asset/public";

    await expect(fetchSafeOgImage(url)).resolves.toBeNull();
    await expect(fetchSafeOgImage(url)).resolves.toBeNull();
  });

  it("허용된 Cloudflare 이미지 응답은 제한된 Buffer로 반환한다", async () => {
    mocks.lookup.mockResolvedValue([{ address: "104.16.1.1", family: 4 }]);
    vi.mocked(fetch).mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png" },
      })
    );
    const { fetchSafeOgImage } = await import("./safeImageFetch");

    await expect(
      fetchSafeOgImage("https://imagedelivery.net/hash/asset/public")
    ).resolves.toEqual(Buffer.from([1, 2, 3]));
    expect(fetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        headers: {
          Accept: "image/png,image/jpeg,image/webp,image/gif,image/avif",
        },
      })
    );
  });

  it("응답이 제한 시간 안에 오지 않으면 요청을 중단한다", async () => {
    vi.useFakeTimers();
    mocks.lookup.mockResolvedValue([{ address: "104.16.1.1", family: 4 }]);
    vi.mocked(fetch).mockImplementation(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError"))
          );
        })
    );
    const { fetchSafeOgImage } = await import("./safeImageFetch");
    const pending = fetchSafeOgImage(
      "https://imagedelivery.net/hash/asset/public"
    );

    await vi.advanceTimersByTimeAsync(3_001);
    await expect(pending).resolves.toBeNull();
  });
});
