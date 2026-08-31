/**
 * File Name : app/opengraph-image.test.ts
 * Description : 동적 상세 OG 이미지의 비동기 경로 정보 처리 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.30  임도헌   Created   게시글·상품·방송의 자동 생성 OG 이미지와 고정 이미지 URL 경로 검증
 * 2026.08.31  임도헌   Modified  로컬 Pretendard 글꼴을 사용하는 기본 한글 OG 이미지 생성 경로 검증
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import PostOpenGraphImage from "@/app/(app)/posts/[id]/opengraph-image";
import ProductOpenGraphImage from "@/app/(app)/products/view/[id]/opengraph-image";
import StreamOpenGraphImage from "@/app/(app)/streams/[id]/opengraph-image";
import { GET as getPostOpenGraphImage } from "@/app/(app)/posts/[id]/og-image/route";
import { GET as getProductOpenGraphImage } from "@/app/(app)/products/view/[id]/og-image/route";
import { GET as getStreamOpenGraphImage } from "@/app/(app)/streams/[id]/og-image/route";

const mocks = vi.hoisted(() => ({
  findPost: vi.fn(),
  findProduct: vi.fn(),
  findBroadcast: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  default: {
    post: { findUnique: mocks.findPost },
    product: { findUnique: mocks.findProduct },
    broadcast: { findUnique: mocks.findBroadcast },
  },
}));

describe("dynamic Open Graph images", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findPost.mockResolvedValue(null);
    mocks.findProduct.mockResolvedValue(null);
    mocks.findBroadcast.mockResolvedValue(null);
  });

  it("게시글 자동 생성 이미지와 고정 URL이 비동기 경로 정보를 처리한다", async () => {
    const directResponse = await PostOpenGraphImage({
      params: Promise.resolve({ id: "41" }),
    });

    expect(directResponse.headers.get("content-type")).toBe("image/png");
    expect(mocks.findPost).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 41 } })
    );

    mocks.findPost.mockClear();
    const routeResponse = await getPostOpenGraphImage(
      new Request("https://boardport.life/posts/41/og-image"),
      { params: Promise.resolve({ id: "41" }) }
    );

    expect(routeResponse.headers.get("content-type")).toBe("image/png");
    expect(mocks.findPost).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 41 } })
    );
  });

  it("상품 자동 생성 이미지와 고정 URL이 비동기 경로 정보를 처리한다", async () => {
    const directResponse = await ProductOpenGraphImage({
      params: Promise.resolve({ id: "52" }),
    });

    expect(directResponse.headers.get("content-type")).toBe("image/png");
    expect(mocks.findProduct).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 52 } })
    );

    mocks.findProduct.mockClear();
    const routeResponse = await getProductOpenGraphImage(
      new Request("https://boardport.life/products/view/52/og-image"),
      { params: Promise.resolve({ id: "52" }) }
    );

    expect(routeResponse.headers.get("content-type")).toBe("image/png");
    expect(mocks.findProduct).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 52 } })
    );
  });

  it("방송 자동 생성 이미지와 고정 URL이 비동기 경로 정보를 처리한다", async () => {
    const directResponse = await StreamOpenGraphImage({
      params: Promise.resolve({ id: "63" }),
    });

    expect(directResponse.headers.get("content-type")).toBe("image/png");
    expect(mocks.findBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 63 } })
    );

    mocks.findBroadcast.mockClear();
    const routeResponse = await getStreamOpenGraphImage(
      new Request("https://boardport.life/streams/63/og-image"),
      { params: Promise.resolve({ id: "63" }) }
    );

    expect(routeResponse.headers.get("content-type")).toBe("image/png");
    expect(mocks.findBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 63 } })
    );
  });
});
