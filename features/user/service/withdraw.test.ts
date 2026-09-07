/** 탈퇴 transaction의 이미지 정리 기록과 실패 경계 검증 */
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  transaction: vi.fn(),
  findAssets: vi.fn(),
  deleteUser: vi.fn(),
  enqueue: vi.fn(),
  process: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    user: { findUnique: mocks.findUser },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/features/post/service/post", () => ({
  hardDeletePostWithCleanup: vi.fn(),
}));
vi.mock("@/features/product/service/delete", () => ({
  hardDeleteProductWithCleanup: vi.fn(),
}));
vi.mock("@/features/stream/service/delete", () => ({
  hardDeleteBroadcastWithCleanup: vi.fn(),
}));
vi.mock("@/features/post/service/video", () => ({
  deleteCloudflareStreamAsset: vi.fn(),
}));
vi.mock("@/features/stream/service/liveInput", () => ({
  deleteCloudflareLiveInputAsset: vi.fn(),
}));
vi.mock("@/features/report/service/moderationOutbox", () => ({
  enqueueModerationOutboxJobs: mocks.enqueue,
  processModerationOutboxBatch: mocks.process,
}));
import { withdrawUser } from "./withdraw";
const tx = {
  $queryRaw: vi.fn(),
  mediaAsset: { findMany: mocks.findAssets },
  user: { delete: mocks.deleteUser },
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.process.mockResolvedValue({ claimed: 0, completed: 0, failed: 0 });
  mocks.findUser.mockResolvedValue({
    live_inputs: null,
    posts: [],
    products: [],
    post_videos: [],
  });
  mocks.findAssets.mockResolvedValue([{ providerAssetId: "remaining-avatar" }]);
  mocks.transaction.mockImplementation(async (callback) => callback(tx));
});
it("사용자 삭제와 같은 transaction에 provider ID 보존", async () => {
  await expect(withdrawUser(7)).resolves.toEqual({ success: true });
  expect(mocks.enqueue).toHaveBeenCalledWith(tx, [
    {
      dedupeKey: "withdraw:7:images",
      kind: "DELETE_IMAGE_ASSETS",
      payload: { providerAssetIds: ["remaining-avatar"] },
    },
  ]);
  expect(mocks.enqueue.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.deleteUser.mock.invocationCallOrder[0]
  );
  expect(mocks.deleteUser.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.process.mock.invocationCallOrder[0]
  );
});
it("outbox 저장 실패 시 사용자 삭제 중단", async () => {
  mocks.enqueue.mockRejectedValue(new Error("database unavailable"));
  expect((await withdrawUser(7)).success).toBe(false);
  expect(mocks.deleteUser).not.toHaveBeenCalled();
  expect(mocks.process).not.toHaveBeenCalled();
});
it("commit 후 worker 실패는 탈퇴 성공을 뒤집지 않음", async () => {
  mocks.process.mockRejectedValue(new Error("worker unavailable"));
  await expect(withdrawUser(7)).resolves.toEqual({ success: true });
  expect(mocks.deleteUser).toHaveBeenCalledWith({ where: { id: 7 } });
});
