/**
 * File Name : features/auth/utils/redirect.test.ts
 * Description : callback/returnTo 내부 경로 정규화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   Open Redirect 방어와 내부 경로 허용 기준 테스트 추가
 */

import { describe, expect, it } from "vitest";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";

describe("sanitizeCallbackUrl", () => {
  it("빈 값이나 문자열이 아닌 값은 루트 경로로 대체한다", () => {
    expect(sanitizeCallbackUrl("")).toBe("/");
    expect(sanitizeCallbackUrl(null)).toBe("/");
    expect(sanitizeCallbackUrl(undefined)).toBe("/");
    expect(sanitizeCallbackUrl(123)).toBe("/");
  });

  it("내부 경로는 유지한다", () => {
    expect(sanitizeCallbackUrl("/posts")).toBe("/posts");
    expect(
      sanitizeCallbackUrl("/products?openProductId=1&returnTo=%2Fproducts")
    ).toBe("/products?openProductId=1&returnTo=/products");
  });

  it("외부 절대 URL과 네트워크 경로는 루트 경로로 대체한다", () => {
    expect(sanitizeCallbackUrl("https://example.com/posts")).toBe("/");
    expect(sanitizeCallbackUrl("http://example.com/posts")).toBe("/");
    expect(sanitizeCallbackUrl("//example.com/posts")).toBe("/");
  });

  it("디코딩 후 외부 네트워크 경로가 되는 값도 차단한다", () => {
    // returnTo는 query string을 거치며 인코딩될 수 있으므로 디코딩 후에도 외부 경로 여부를 다시 확인
    expect(sanitizeCallbackUrl("/%2F%2Fexample.com/posts")).toBe("/");
  });

  it("잘못 인코딩된 값은 루트 경로로 대체한다", () => {
    expect(sanitizeCallbackUrl("/posts/%E0%A4%A")).toBe("/");
  });

  it("슬래시로 시작하지 않는 상대 경로는 허용하지 않는다", () => {
    expect(sanitizeCallbackUrl("posts")).toBe("/");
  });
});
