/**
 * File Name : features/post/utils/image.test.ts
 * Description : 게시글 이미지 URL 보조 유틸 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.11  임도헌   Created   Cloudflare Images public variant 정규화 검증
 */

import { describe, expect, it } from "vitest";
import { toPostImagePublicUrl } from "@/features/post/utils/image";

describe("toPostImagePublicUrl", () => {
  const baseUrl = "https://imagedelivery.net/account/image-id";

  it("Cloudflare Images 원본 URL에 public variant를 추가한다", () => {
    expect(toPostImagePublicUrl(baseUrl)).toBe(`${baseUrl}/public`);
  });

  it("이미 포함된 public variant를 중복해서 추가하지 않는다", () => {
    expect(toPostImagePublicUrl(`${baseUrl}/public`)).toBe(
      `${baseUrl}/public`
    );
  });

  it("외부 임베드 썸네일 URL은 그대로 유지한다", () => {
    const externalUrl = "https://i.ytimg.com/vi/video/hqdefault.jpg";
    expect(toPostImagePublicUrl(externalUrl)).toBe(externalUrl);
  });

  it("빈 URL은 null로 정규화한다", () => {
    expect(toPostImagePublicUrl(null)).toBeNull();
  });
});
