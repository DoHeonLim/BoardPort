/**
 * File Name : features/notification/utils/pwaCachePolicy.test.ts
 * Description : PWA 정적 자산 캐시 경계 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.23  임도헌   Created   API·RSC·인증 HTML의 runtime cache 제외 경계 검증
 */

import { describe, expect, it } from "vitest";
import { isPwaStaticAssetPath } from "./pwaCachePolicy";

/**
 * Service Worker runtime cache가 공용 정적 자산만 허용하는지 검증한다.
 */
describe("isPwaStaticAssetPath", () => {
  it.each([
    "/_next/static/chunks/app.js",
    "/_next/static/css/app.css",
    "/images/logo-symbol.png",
  ])("공용 정적 자산을 허용한다: %s", (pathname) => {
    expect(isPwaStaticAssetPath(pathname)).toBe(true);
  });

  it.each([
    "/api/me",
    "/api/products",
    "/_next/image?url=%2Fprivate.png",
    "/profile",
    "/products?range=LOCAL",
  ])("계정 또는 동적 응답을 제외한다: %s", (pathname) => {
    expect(isPwaStaticAssetPath(pathname)).toBe(false);
  });
});
