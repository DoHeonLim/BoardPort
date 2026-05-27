/**
 * File Name : features/stream/utils/image.test.ts
 * Description : 방송 썸네일 Cloudflare delivery URL 정규화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   방송 썸네일 public variant와 이미지 ID 추출 테스트 추가
 * 2026.05.26  임도헌   Modified  이미 public variant가 붙은 썸네일 URL 중복 방지 테스트 추가
 */

import { describe, expect, it } from "vitest";
import {
  buildStreamImageDeliveryUrl,
  extractCloudflareImageId,
  toStreamThumbnailPublicUrl,
} from "./image";

describe("stream image utils", () => {
  const accountHash = "3o3hwIVwLhMgAkoMCda2JQ";
  const imageId = "55cfdd12-033e-4c98-973d-aea323285d00";
  const baseUrl = `https://imagedelivery.net/${accountHash}/${imageId}`;

  it("Cloudflare Images 원본 delivery URL을 생성한다", () => {
    expect(buildStreamImageDeliveryUrl(accountHash, imageId)).toBe(baseUrl);
  });

  it("Cloudflare Images 썸네일에 public variant를 붙인다", () => {
    expect(toStreamThumbnailPublicUrl(baseUrl)).toBe(`${baseUrl}/public`);
  });

  it("이미 public variant가 붙은 썸네일 URL은 중복 처리하지 않는다", () => {
    expect(toStreamThumbnailPublicUrl(`${baseUrl}/public`)).toBe(
      `${baseUrl}/public`
    );
  });

  it("비 Cloudflare 썸네일 URL은 그대로 유지한다", () => {
    const externalUrl = "https://example.com/thumbnail.png";

    expect(toStreamThumbnailPublicUrl(externalUrl)).toBe(externalUrl);
    expect(toStreamThumbnailPublicUrl(null)).toBeNull();
  });

  it("Cloudflare Images URL에서 이미지 ID를 추출한다", () => {
    expect(extractCloudflareImageId(`${baseUrl}/public`)).toBe(imageId);
    expect(
      extractCloudflareImageId("https://example.com/thumbnail.png")
    ).toBeNull();
    expect(extractCloudflareImageId("not-a-url")).toBeNull();
  });
});
