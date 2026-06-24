/**
 * File Name : tests/e2e/auth-guard.spec.ts
 * Description : 비로그인 보호 경로 redirect smoke 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   주요 보호 경로의 로그인 redirect와 callbackUrl 보존 테스트 추가
 */

import { expect, test } from "@playwright/test";

const protectedRoutes = [
  "/products",
  "/posts",
  "/chat",
  "/profile",
] as const;

test.describe("auth guard smoke", () => {
  for (const route of protectedRoutes) {
    test(`비로그인 상태에서 ${route} 접근 시 로그인 페이지로 이동한다`, async ({
      page,
    }) => {
      await page.goto(route);

      await expect(page).toHaveURL(/\/login/);

      const currentUrl = new URL(page.url());
      expect(currentUrl.pathname).toBe("/login");
      expect(currentUrl.searchParams.get("callbackUrl")).toBe(route);
    });
  }
});
