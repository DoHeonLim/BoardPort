/**
 * File Name : features/media/service/assets.test.ts
 * Description : MediaAsset 연결 소유권 경계 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.22  임도헌   Created   사용자·용도·엔터티별 이미지 attach 거부/허용 검증
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@/generated/prisma/client";

vi.mock("server-only", () => ({}));

const mediaAsset = {
  findMany: vi.fn(),
  updateMany: vi.fn(),
};
const tx = { mediaAsset } as unknown as Prisma.TransactionClient;
const url = "https://imagedelivery.net/account-hash/image-id";

describe("attachOwnedMediaAssets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_HASH", "account-hash");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("다른 사용자 또는 다른 용도의 업로드 자산 연결을 거부한다", async () => {
    mediaAsset.findMany.mockResolvedValue([
      {
        providerAssetId: "image-id",
        ownerId: 99,
        purpose: "POST_IMAGE",
        state: "PENDING",
        linkedEntityId: null,
        deliveryUrl: url,
        expires_at: new Date(Date.now() + 60_000),
      },
    ]);
    const { attachOwnedMediaAssets } = await import("./assets");

    await expect(
      attachOwnedMediaAssets(tx, {
        ownerId: 10,
        purpose: "PRODUCT_IMAGE",
        urls: [url],
        linkedEntityId: "1",
      })
    ).rejects.toThrow("소유권");
    expect(mediaAsset.updateMany).not.toHaveBeenCalled();
  });

  it("본인의 유효한 pending 자산만 지정 엔터티에 연결한다", async () => {
    mediaAsset.findMany.mockResolvedValue([
      {
        providerAssetId: "image-id",
        ownerId: 10,
        purpose: "PRODUCT_IMAGE",
        state: "PENDING",
        linkedEntityId: null,
        deliveryUrl: url,
        expires_at: new Date(Date.now() + 60_000),
      },
    ]);
    mediaAsset.updateMany.mockResolvedValue({ count: 1 });
    const { attachOwnedMediaAssets } = await import("./assets");

    await expect(
      attachOwnedMediaAssets(tx, {
        ownerId: 10,
        purpose: "PRODUCT_IMAGE",
        urls: [url],
        linkedEntityId: "1",
      })
    ).resolves.toEqual([url]);
    expect(mediaAsset.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          state: "ATTACHED",
          linkedEntityId: "1",
        }),
      })
    );
  });
});
