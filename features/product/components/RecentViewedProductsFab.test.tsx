// @vitest-environment jsdom
/**
 * File Name : features/product/components/RecentViewedProductsFab.test.tsx
 * Description : 최근 본 상품의 검증 전 렌더링 보류·조회 실패 기록 보존·창 복귀 정리 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.05  임도헌   Created   최근 본 상품의 검증 전 렌더링 보류·조회 실패 기록 보존·창 복귀 정리 회귀 테스트
 */

import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RecentViewedProduct } from "@/features/product/utils/recentViewed";
import {
  getRecentViewedProducts,
  saveRecentViewedProduct,
} from "@/features/product/utils/recentViewed";

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/features/product/actions/list", () => ({
  getRecentProductsAction: mocks.load,
}));
vi.mock("next/image", () => ({
  default: ({ src }: { src: string }) => <span data-testid="image">{src}</span>,
}));
vi.mock("@/components/global/BottomSheet", () => ({ default: () => null }));
vi.mock("@/features/product/components/productCard", () => ({
  default: () => null,
}));
vi.mock("@/hooks/useModalFocus", () => ({ useModalFocus: () => {} }));
import RecentViewedProductsFab from "./RecentViewedProductsFab";

const product = {
  id: 1,
  title: "삭제 대상",
  images: [{ url: "https://example.com/deleted.webp", order: 0 }],
} as RecentViewedProduct;

describe("최근 본 상품 렌더링 검증", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    saveRecentViewedProduct(product);
  });
  afterEach(cleanup);

  it("검증 전 삭제 이미지 요청을 만들지 않고 삭제 기록을 정리한다", async () => {
    let resolve!: (products: RecentViewedProduct[]) => void;
    mocks.load.mockReturnValue(
      new Promise<RecentViewedProduct[]>((r) => {
        resolve = r;
      })
    );
    render(<RecentViewedProductsFab />);
    expect(screen.queryByTestId("image")).toBeNull();
    await act(async () => resolve([]));
    expect(getRecentViewedProducts()).toEqual([]);
    expect(screen.queryByTitle("최근 본 상품 열기")).toBeNull();
  });

  it("조회 실패 시 저장된 기록을 삭제하지 않는다", async () => {
    mocks.load.mockRejectedValue(new Error("offline"));
    render(<RecentViewedProductsFab />);
    await waitFor(() => expect(mocks.load).toHaveBeenCalled());
    expect(getRecentViewedProducts()).toEqual([product]);
    expect(screen.queryByTestId("image")).toBeNull();
  });

  it("다른 세션의 삭제를 창 복귀 시 반영한다", async () => {
    mocks.load.mockResolvedValueOnce([product]).mockResolvedValue([]);
    render(<RecentViewedProductsFab />);
    await screen.findByTitle("최근 본 상품 열기");
    await act(async () => window.dispatchEvent(new Event("focus")));
    await waitFor(() =>
      expect(screen.queryByTitle("최근 본 상품 열기")).toBeNull()
    );
    expect(getRecentViewedProducts()).toEqual([]);
  });
});
