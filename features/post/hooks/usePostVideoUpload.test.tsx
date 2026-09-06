// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { usePostVideoUpload } from "./usePostVideoUpload";
import type { PostVideo } from "@/features/post/types";
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  remove: vi.fn(),
  failed: vi.fn(),
}));
vi.mock("@/features/post/actions/video", () => ({
  createPostVideoUploadSessionAction: mocks.create,
  removePostVideoDraftAction: mocks.remove,
  markPostVideoDraftFailedAction: mocks.failed,
}));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
it.each([true, false])(
  "교체 업로드 성공 여부 %s에 따른 기존 첨부 보존",
  async (success) => {
    const initial: PostVideo = {
      provider: "CLOUDFLARE_STREAM",
      providerAssetId: "old",
      uploadUid: "old",
      draftKey: "old-draft",
      status: "READY",
    };
    mocks.create.mockResolvedValue({
      success: true,
      data: { draftKey: "new-draft", uploadUid: "new", uploadUrl: "/upload" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: success }));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const setValue = vi.fn();
    const { result } = renderHook(() =>
      usePostVideoUpload({ initialVideo: initial, setValue })
    );
    await act(async () =>
      result.current.handleVideoFiles([
        new File(["video"], "new.mp4", { type: "video/mp4" }),
      ])
    );
    if (success) {
      expect(result.current.videoState?.draftKey).toBe("new-draft");
      expect(mocks.remove).toHaveBeenCalledWith({
        draftKey: "old-draft",
        uploadUid: "old",
      });
    } else {
      expect(result.current.videoState).toEqual(initial);
      expect(setValue).not.toHaveBeenCalled();
      expect(mocks.remove).not.toHaveBeenCalled();
      expect(mocks.failed).toHaveBeenCalledWith({
        draftKey: "new-draft",
        uploadUid: "new",
      });
    }
  }
);
