/**
 * File Name : lib/cloudflareImages.test.ts
 * Description : Cloudflare 이미지 업로드 URL 발급 인증 경계 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.27  임도헌   Created   이미지 direct upload URL 발급 세션/사용자 상태 가드 테스트 추가
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  validateUserStatus: vi.fn(),
}));

vi.mock("server-only", () => ({}));

vi.mock("@/lib/session", () => ({
  default: mocks.getSession,
}));

vi.mock("@/features/user/service/admin", () => ({
  validateUserStatus: mocks.validateUserStatus,
}));

describe("getUploadUrl", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("비로그인 요청은 Cloudflare upload URL 발급을 시작하지 않는다", async () => {
    const { getUploadUrl } = await import("./cloudflareImages");

    mocks.getSession.mockResolvedValue(null);

    const result = await getUploadUrl();

    expect(result).toEqual({
      success: false,
      error: "로그인이 필요합니다.",
    });
    expect(mocks.validateUserStatus).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("정지 등 사용자 상태 가드에 실패하면 Cloudflare 요청을 보내지 않는다", async () => {
    const { getUploadUrl } = await import("./cloudflareImages");

    mocks.getSession.mockResolvedValue({ id: 10 });
    mocks.validateUserStatus.mockResolvedValue({
      success: false,
      error: "운영 정책에 의해 이용이 제한된 계정입니다.",
    });

    const result = await getUploadUrl();

    expect(result).toEqual({
      success: false,
      error: "운영 정책에 의해 이용이 제한된 계정입니다.",
    });
    expect(mocks.validateUserStatus).toHaveBeenCalledWith(10);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("정상 로그인 사용자는 Cloudflare upload URL을 발급받을 수 있다", async () => {
    vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", "account-id");
    vi.stubEnv("CLOUDFLARE_API_TOKEN", "api-token");

    const { getUploadUrl } = await import("./cloudflareImages");

    mocks.getSession.mockResolvedValue({ id: 10 });
    mocks.validateUserStatus.mockResolvedValue({ success: true });
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          result: {
            uploadURL: "https://upload.example.test",
            id: "image-id",
          },
        }),
        { status: 200 }
      )
    );

    const result = await getUploadUrl();

    expect(result).toEqual({
      success: true,
      result: {
        uploadURL: "https://upload.example.test",
        id: "image-id",
      },
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.cloudflare.com/client/v4/accounts/account-id/images/v2/direct_upload",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer api-token",
        },
      }
    );
  });
});
