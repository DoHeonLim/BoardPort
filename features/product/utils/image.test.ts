/**
 * File Name : features/product/utils/image.test.ts
 * Description : 상품 이미지 Cloudflare delivery URL 정규화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   상품 썸네일 public variant와 이미지 ID 추출 테스트 추가
 */

import { describe, expect, it } from "vitest";
import {
  extractCloudflareImageId,
  stripProductImagePublicVariant,
  toProductImagePublicUrl,
} from "./image";

describe("product image utils", () => {
  const baseUrl =
    "https://imagedelivery.net/3o3hwIVwLhMgAkoMCda2JQ/55cfdd12-033e-4c98-973d-aea323285d00";

  it("Cloudflare Images URL에 public variant를 붙인다", () => {
    expect(toProductImagePublicUrl(baseUrl)).toBe(`${baseUrl}/public`);
  });

  it("이미 public variant가 붙은 URL은 중복 처리하지 않는다", () => {
    expect(toProductImagePublicUrl(`${baseUrl}/public`)).toBe(
      `${baseUrl}/public`
    );
  });

  it("Cloudflare Images가 아닌 URL은 썸네일 렌더링 대상에서 제외한다", () => {
    expect(
      toProductImagePublicUrl("https://example.com/image.png")
    ).toBeUndefined();
    expect(toProductImagePublicUrl("not-a-url")).toBeUndefined();
    expect(toProductImagePublicUrl(null)).toBeUndefined();
  });

  it("public variant를 제거해 원본 Cloudflare Images URL로 복원한다", () => {
    expect(stripProductImagePublicVariant(`${baseUrl}/public`)).toBe(baseUrl);
    expect(stripProductImagePublicVariant(baseUrl)).toBe(baseUrl);
  });

  it("Cloudflare Images delivery URL에서 이미지 ID를 추출한다", () => {
    expect(extractCloudflareImageId(`${baseUrl}/public`)).toBe(
      "55cfdd12-033e-4c98-973d-aea323285d00"
    );
    expect(extractCloudflareImageId("https://example.com/image.png")).toBeNull();
  });
});
