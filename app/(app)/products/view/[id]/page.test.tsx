/**
 * File Name : app/(app)/products/view/[id]/page.test.tsx
 * Description : 상품 상세 헤더 복귀 경로 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.03  임도헌   Created   새 탭 fallback과 명시적 returnTo 우선 사용 검증
 */

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  getProductDetailViewData: vi.fn(),
  incrementViews: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NOT_FOUND");
  }),
  redirect: vi.fn((href: string) => {
    throw new Error(`REDIRECT:${href}`);
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/session", () => ({ default: mocks.getSession }));
vi.mock("@/features/product/service/detail", () => ({
  getProductDetailViewData: mocks.getProductDetailViewData,
  getProductTitleById: vi.fn(),
}));
vi.mock("@/features/common/service/view", () => ({
  incrementViews: mocks.incrementViews,
}));
vi.mock("@/lib/socialCrawler", () => ({
  isSocialCrawlerUserAgent: () => false,
}));

vi.mock("@/components/global/BackButton", () => ({
  default: ({
    fallbackHref,
    preferFallback,
  }: {
    fallbackHref: string;
    preferFallback?: boolean;
  }) => (
    <button
      type="button"
      data-testid="product-back"
      data-fallback-href={fallbackHref}
      data-prefer-fallback={String(!!preferFallback)}
    >
      뒤로가기
    </button>
  ),
}));

vi.mock("@/features/product/components/productDetail", () => ({
  default: () => <div>상품 상세</div>,
}));
vi.mock("@/features/product/components/productDetail/ProductOwnerMenu", () => ({
  default: () => null,
}));
vi.mock(
  "@/features/product/components/productDetail/ProductOptionMenu",
  () => ({ default: () => null })
);
vi.mock("@/features/product/components/ProductShareButton", () => ({
  default: () => null,
}));

describe("ProductDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: 200 });
    mocks.incrementViews.mockResolvedValue(false);
    mocks.getProductDetailViewData.mockResolvedValue({
      product: {
        id: 572,
        title: "테스트 상품",
        description: "설명",
        userId: 201,
        user: { id: 201, username: "testb" },
        images: [],
        categoryId: null,
        category: null,
        views: 0,
        hidden_at: null,
        reservation_userId: null,
        purchase_userId: null,
      },
      likeStatus: { likeCount: 0, isLiked: false },
      isOwner: false,
      isBlocked: false,
    });
  });

  it("returnTo가 없는 새 탭 상세는 상품 목록 fallback을 우선한다", async () => {
    const { default: ProductDetailPage } = await import("./page");
    render(
      await ProductDetailPage({
        params: Promise.resolve({ id: "572" }),
        searchParams: Promise.resolve({}),
      })
    );

    const backButton = screen.getByTestId("product-back");
    expect(backButton).toHaveAttribute("data-fallback-href", "/products");
    expect(backButton).toHaveAttribute("data-prefer-fallback", "true");
  });

  it("명시된 내부 returnTo도 브라우저 방문 기록보다 우선한다", async () => {
    const { default: ProductDetailPage } = await import("./page");
    render(
      await ProductDetailPage({
        params: Promise.resolve({ id: "572" }),
        searchParams: Promise.resolve({
          returnTo: "/chats/room-trade-complete",
        }),
      })
    );

    const backButton = screen.getByTestId("product-back");
    expect(backButton).toHaveAttribute(
      "data-fallback-href",
      "/chats/room-trade-complete"
    );
    expect(backButton).toHaveAttribute("data-prefer-fallback", "true");
  });
});
