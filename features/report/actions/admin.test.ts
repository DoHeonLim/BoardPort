/**
 * File Name : features/report/actions/admin.test.ts
 * Description : 관리자 신고 처리 Action의 상세 cache tag 갱신 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.09  임도헌   Created   신고로 삭제된 상품·게시글·방송의 updateTag 호출 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyAdminAccess: vi.fn(),
  updateReportStatus: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/features/auth/service/authSession", () => ({
  verifyAdminAccess: mocks.verifyAdminAccess,
}));
vi.mock("@/features/report/service/admin", () => ({
  getReportsAdmin: vi.fn(),
  getReportInsights: vi.fn(),
  updateReportStatus: mocks.updateReportStatus,
}));
vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
  updateTag: mocks.updateTag,
}));

describe("updateReportAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyAdminAccess.mockResolvedValue({ success: true, adminId: 7 });
    mocks.updateReportStatus.mockResolvedValue({
      success: true,
      data: {
        revalidationPaths: ["/admin/reports", "/posts"],
        productDetailId: 11,
        postDetailId: 22,
        broadcastDetailId: 33,
      },
    });
  });

  it("처리 성공 후 경로와 도메인별 상세 tag를 갱신한다", async () => {
    const { updateReportAction } = await import("./admin");

    await expect(
      updateReportAction(5, "RESOLVED", {
        action: "DELETE_CONTENT",
        adminComment: "삭제 조치입니다.",
        strike: 0,
      })
    ).resolves.toMatchObject({ success: true });

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/reports");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/posts");
    expect(mocks.updateTag).toHaveBeenCalledWith("product-detail-11");
    expect(mocks.updateTag).toHaveBeenCalledWith("post-detail-22");
    expect(mocks.updateTag).toHaveBeenCalledWith("broadcast-detail-33");
  });
});
