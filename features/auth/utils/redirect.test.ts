/**
 * File Name : features/auth/utils/redirect.test.ts
 * Description : callback/returnTo 내부 경로 정규화 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   Open Redirect 방어와 내부 경로 허용 기준 테스트 추가
 * 2026.08.23  임도헌   Modified  역슬래시·제어문자·다중 인코딩·길이 경계 검증 추가
 * 2026.08.30  임도헌   Modified  기본 인증 복귀 경로 생략과 사용자 목적지 보존 검증 추가
 */

import { describe, expect, it } from "vitest";
import {
  buildAuthFlowHref,
  sanitizeCallbackUrl,
} from "@/features/auth/utils/redirect";

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

  it("역슬래시와 인코딩된 역슬래시는 차단한다", () => {
    expect(sanitizeCallbackUrl("/\\evil.example")).toBe("/");
    expect(sanitizeCallbackUrl("/%5Cevil.example")).toBe("/");
    expect(sanitizeCallbackUrl("/%255Cevil.example")).toBe("/");
  });

  it("제어문자와 인코딩된 제어문자는 차단한다", () => {
    expect(sanitizeCallbackUrl("/posts\n/next")).toBe("/");
    expect(
      sanitizeCallbackUrl("/posts%0d%0aLocation:%20https://evil.example")
    ).toBe("/");
  });

  it("비정상적으로 긴 callback URL은 차단한다", () => {
    expect(sanitizeCallbackUrl(`/${"a".repeat(2048)}`)).toBe("/");
  });

  it("잘못 인코딩된 값은 루트 경로로 대체한다", () => {
    expect(sanitizeCallbackUrl("/posts/%E0%A4%A")).toBe("/");
  });

  it("슬래시로 시작하지 않는 상대 경로는 허용하지 않는다", () => {
    expect(sanitizeCallbackUrl("posts")).toBe("/");
  });
});

describe("buildAuthFlowHref", () => {
  it("기본 프로필 복귀 경로는 인증 화면 주소에서 생략한다", () => {
    expect(buildAuthFlowHref("/create-account", "/profile")).toBe(
      "/create-account"
    );
    expect(buildAuthFlowHref("/login", undefined)).toBe("/login");
  });

  it("다른 내부 목적지는 인증 흐름이 끝날 때까지 유지한다", () => {
    expect(buildAuthFlowHref("/create-account", "/products/12?tab=chat")).toBe(
      "/create-account?callbackUrl=%2Fproducts%2F12%3Ftab%3Dchat"
    );
  });

  it("외부 목적지는 안전한 루트 경로로 정규화해 전달한다", () => {
    expect(buildAuthFlowHref("/login", "https://example.com/products")).toBe(
      "/login?callbackUrl=%2F"
    );
  });
});
