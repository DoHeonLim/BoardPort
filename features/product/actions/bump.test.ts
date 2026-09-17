/**
 * File Name : features/product/actions/bump.test.ts
 * Description : 상품 끌어올리기 Action의 세션과 상세 캐시 갱신 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.09  임도헌   Created   성공한 끌어올리기의 updateTag 책임과 실패 경계 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  bumpProduct: vi.fn(),
  updateTag: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/product/service/bump", () => ({
  bumpProduct: mocks.bumpProduct,
}));
vi.mock("next/cache", () => ({ updateTag: mocks.updateTag }));

describe("bumpProductAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.bumpProduct.mockResolvedValue({ success: true });
  });

  it("끌어올리기 성공 후 상세 태그를 즉시 만료한다", async () => {
    const { bumpProductAction } = await import("./bump");

    await expect(bumpProductAction(31)).resolves.toEqual({ success: true });
    expect(mocks.bumpProduct).toHaveBeenCalledWith(7, 31);
    expect(mocks.updateTag).toHaveBeenCalledWith("product-detail-31");
  });

  it("끌어올리기 실패 시 상세 태그를 만료하지 않는다", async () => {
    mocks.bumpProduct.mockResolvedValue({
      success: false,
      error: "끌어올릴 수 없습니다.",
    });
    const { bumpProductAction } = await import("./bump");

    await expect(bumpProductAction(31)).resolves.toEqual({
      success: false,
      error: "끌어올릴 수 없습니다.",
    });
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });

  it("세션이 없으면 서비스를 호출하지 않는다", async () => {
    mocks.getSession.mockResolvedValue({});
    const { bumpProductAction } = await import("./bump");

    await expect(bumpProductAction(31)).resolves.toEqual({
      success: false,
      error: "로그인이 필요합니다.",
    });
    expect(mocks.bumpProduct).not.toHaveBeenCalled();
    expect(mocks.updateTag).not.toHaveBeenCalled();
  });
});
