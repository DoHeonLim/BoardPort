/**
 * File Name : tests/e2e/seeded-content-list.spec.ts
 * Description : E2E seed 콘텐츠 목록 표시 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   상품/게시글 seed 콘텐츠의 목록 노출과 삭제 콘텐츠 제외 테스트 추가
 */

import { expect, test } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

test.describe("seeded content list regressions", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("상품 목록은 살아 있는 seed 상품만 표시한다", async ({ page }) => {
    await loginWithEmail(page, E2E_BUYER, "/products");

    await expect(page.getByText("[E2E] 삭제 복귀 상품")).toBeVisible();
    await expect(page.getByText("[E2E] 삭제된 상품 알림 대상")).toHaveCount(0);
  });

  test("게시글 목록은 살아 있는 seed 게시글만 표시한다", async ({ page }) => {
    await loginWithEmail(page, E2E_BUYER, "/posts");

    await expect(page.getByText("[E2E] 삭제 복귀 게시글")).toBeVisible();
    await expect(page.getByText("[E2E] 삭제된 게시글 알림 대상")).toHaveCount(0);
  });
});
