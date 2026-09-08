/**
 * File Name : features/stream/service/update.test.ts
 * Description : 방송 표시 정보와 사용자 썸네일 교체·제거 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.08  임도헌   Created   썸네일 변경 여부·소유권 연결·이전 자산 정리 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateUserStatus: vi.fn(),
  broadcastFindUnique: vi.fn(),
  broadcastUpdate: vi.fn(),
  notificationUpdateMany: vi.fn(),
  transaction: vi.fn(),
  attachOwnedMediaAssets: vi.fn(),
  detachMissingMediaAssets: vi.fn(),
  deleteCloudflareImageAssetsById: vi.fn(),
}));

const tx = {
  broadcast: { update: mocks.broadcastUpdate },
  notification: { updateMany: mocks.notificationUpdateMany },
};

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    broadcast: { findUnique: mocks.broadcastFindUnique },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/features/user/service/admin", () => ({
  validateUserStatus: mocks.validateUserStatus,
}));
vi.mock("@/features/media/service/assets", () => ({
  attachOwnedMediaAssets: mocks.attachOwnedMediaAssets,
  detachMissingMediaAssets: mocks.detachMissingMediaAssets,
  deleteCloudflareImageAssetsById: mocks.deleteCloudflareImageAssetsById,
}));

const existingBroadcast = {
  id: 10,
  thumbnail: "https://imagedelivery.net/account/old-image",
  thumbnailAnimated: true,
  liveInput: {
    userId: 7,
    user: { username: "captain" },
  },
};

const updatedBroadcast = {
  id: 10,
  title: "수정한 방송 제목",
  description: "수정한 설명",
  thumbnail: existingBroadcast.thumbnail,
  thumbnailAnimated: true,
  liveInput: { user: { username: "captain" } },
};

describe("updateBroadcastMeta", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.validateUserStatus.mockResolvedValue({ success: true });
    mocks.broadcastFindUnique.mockResolvedValue(existingBroadcast);
    mocks.broadcastUpdate.mockResolvedValue(updatedBroadcast);
    mocks.notificationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.attachOwnedMediaAssets.mockResolvedValue([
      "https://imagedelivery.net/account/new-image",
    ]);
    mocks.detachMissingMediaAssets.mockResolvedValue(["old-image"]);
    mocks.deleteCloudflareImageAssetsById.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(
      (callback: (client: typeof tx) => unknown) => callback(tx)
    );
  });

  it("썸네일 필드가 없으면 자동·사용자 썸네일과 MediaAsset을 그대로 유지한다", async () => {
    const { updateBroadcastMeta } = await import("./update");

    const result = await updateBroadcastMeta(7, 10, {
      title: "수정한 방송 제목",
      description: "수정한 설명",
    });

    expect(result.success).toBe(true);
    expect(mocks.broadcastUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          title: "수정한 방송 제목",
          description: "수정한 설명",
        },
      })
    );
    expect(mocks.attachOwnedMediaAssets).not.toHaveBeenCalled();
    expect(mocks.detachMissingMediaAssets).not.toHaveBeenCalled();
    expect(mocks.notificationUpdateMany).not.toHaveBeenCalled();
    expect(mocks.deleteCloudflareImageAssetsById).not.toHaveBeenCalled();
  });

  it("새 썸네일의 소유권을 연결하고 이전 자산과 알림 이미지를 교체한다", async () => {
    mocks.broadcastUpdate.mockResolvedValue({
      ...updatedBroadcast,
      thumbnail: "https://imagedelivery.net/account/new-image",
      thumbnailAnimated: false,
    });
    const { updateBroadcastMeta } = await import("./update");

    const result = await updateBroadcastMeta(7, 10, {
      title: "수정한 방송 제목",
      description: "수정한 설명",
      thumbnail: "https://imagedelivery.net/account/new-image",
      thumbnailAnimated: false,
    });

    expect(result.success).toBe(true);
    expect(mocks.attachOwnedMediaAssets).toHaveBeenCalledWith(tx, {
      ownerId: 7,
      purpose: "STREAM_THUMBNAIL",
      urls: ["https://imagedelivery.net/account/new-image"],
      linkedEntityId: "10",
    });
    expect(mocks.detachMissingMediaAssets).toHaveBeenCalledWith(tx, {
      ownerId: 7,
      purpose: "STREAM_THUMBNAIL",
      linkedEntityId: "10",
      keepUrls: ["https://imagedelivery.net/account/new-image"],
    });
    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith({
      where: {
        link: "/streams/10",
        image: {
          in: [
            "https://imagedelivery.net/account/old-image",
            "https://imagedelivery.net/account/old-image/public",
          ],
        },
      },
      data: {
        image: "https://imagedelivery.net/account/new-image/public",
      },
    });
    expect(mocks.deleteCloudflareImageAssetsById).toHaveBeenCalledWith([
      "old-image",
    ]);
  });

  it("사용자 썸네일 제거 시 기본 이미지 fallback을 위해 DB 값을 비운다", async () => {
    mocks.broadcastUpdate.mockResolvedValue({
      ...updatedBroadcast,
      thumbnail: null,
      thumbnailAnimated: false,
    });
    const { updateBroadcastMeta } = await import("./update");

    const result = await updateBroadcastMeta(7, 10, {
      title: "수정한 방송 제목",
      description: "",
      thumbnail: null,
      thumbnailAnimated: false,
    });

    expect(result.success).toBe(true);
    expect(mocks.attachOwnedMediaAssets).not.toHaveBeenCalled();
    expect(mocks.detachMissingMediaAssets).toHaveBeenCalledWith(tx, {
      ownerId: 7,
      purpose: "STREAM_THUMBNAIL",
      linkedEntityId: "10",
      keepUrls: [],
    });
    expect(mocks.broadcastUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          thumbnail: null,
          thumbnailAnimated: false,
        }),
      })
    );
    expect(mocks.notificationUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { image: null } })
    );
  });

  it("방송 소유자가 아니면 자산 연결과 DB 수정을 시작하지 않는다", async () => {
    mocks.broadcastFindUnique.mockResolvedValue({
      ...existingBroadcast,
      liveInput: { ...existingBroadcast.liveInput, userId: 99 },
    });
    const { updateBroadcastMeta } = await import("./update");

    const result = await updateBroadcastMeta(7, 10, {
      title: "수정한 방송 제목",
      description: "",
      thumbnail: "https://imagedelivery.net/account/new-image",
    });

    expect(result).toEqual({
      success: false,
      error: "방송 수정 권한이 없습니다.",
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.attachOwnedMediaAssets).not.toHaveBeenCalled();
  });
});
