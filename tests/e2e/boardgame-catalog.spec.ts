/**
 * File Name : tests/e2e/boardgame-catalog.spec.ts
 * Description : seed 기반 보드게임 도감 목록/상세 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.26  임도헌   Created   E2E seed 보드게임의 도감 검색/상세 진입 smoke 테스트 추가
 */

import { expect, test } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

const E2E_BOARDGAME_TITLE = "[E2E] 항해자의 도감";
const E2E_BOARDGAME_ORIGINAL_TITLE = "E2E Navigator Catalog";

test.describe("seeded boardgame catalog smoke", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("도감 검색 결과에서 seed 보드게임 상세로 진입할 수 있다", async ({
    page,
  }) => {
    await loginWithEmail(
      page,
      E2E_BUYER,
      `/boardgames?q=${encodeURIComponent("항해자의 도감")}`
    );

    await expect(
      page.getByRole("heading", { name: "보드게임 도감" })
    ).toBeVisible();

    const catalogCard = page
      .getByRole("link")
      .filter({ hasText: E2E_BOARDGAME_TITLE });

    await expect(catalogCard).toBeVisible({ timeout: 15_000 });
    await expect(catalogCard).toContainText(E2E_BOARDGAME_ORIGINAL_TITLE);

    await Promise.all([
      page.waitForURL(/\/boardgames\/\d+/, { timeout: 15_000 }),
      catalogCard.click(),
    ]);

    await expect(
      page.getByRole("heading", { level: 1, name: E2E_BOARDGAME_TITLE })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(E2E_BOARDGAME_ORIGINAL_TITLE)).toBeVisible();
    await expect(page.getByRole("link", { name: /BGG 원문 보기/ })).toBeVisible();
  });
});
