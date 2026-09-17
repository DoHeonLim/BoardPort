/**
 * File Name : features/product/actions/update.test.ts
 * Description : 상품 수정 Action의 캐시 무효화 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.09  임도헌   Created   수정 성공 후 상세 태그 즉시 만료와 관련 경로 갱신 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  updateProduct: vi.fn(),
  safeParse: vi.fn(),
  parseBoardGameIds: vi.fn(),
  updateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/product/service/update", () => ({
  updateProduct: mocks.updateProduct,
}));
vi.mock("@/features/product/schemas", () => ({
  productFormSchema: { safeParse: mocks.safeParse },
}));
vi.mock("@/features/boardgame/utils/form", () => ({
  parseBoardGameIdsFormValue: mocks.parseBoardGameIds,
}));
vi.mock("next/cache", () => ({
  updateTag: mocks.updateTag,
  revalidatePath: mocks.revalidatePath,
}));

describe("updateProductAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 7 });
    mocks.parseBoardGameIds.mockReturnValue([11, 12]);
    mocks.safeParse.mockReturnValue({
      success: true,
      data: { title: "수정된 상품" },
    });
    mocks.updateProduct.mockResolvedValue({ success: true, data: {} });
  });

  it("수정 성공 후 상세 태그를 즉시 만료하고 관련 화면 경로를 갱신한다", async () => {
    const formData = new FormData();
    formData.set("id", "31");
    formData.set("boardGameIds", "[11,12]");
    const { updateProductAction } = await import("./update");

    await expect(updateProductAction(formData)).resolves.toEqual({
      success: true,
      productId: 31,
    });

    expect(mocks.updateProduct).toHaveBeenCalledWith(7, 31, {
      title: "수정된 상품",
    });
    expect(mocks.updateTag).toHaveBeenCalledWith("product-detail-31");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/products");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/products/view/31");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/boardgames/11");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/boardgames/12");
  });
});
