/**
 * File Name : tests/e2e/stream-vod-smoke.spec.ts
 * Description : seed 기반 방송/VOD 목록/상세 E2E smoke 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.26  임도헌   Created   외부 웹훅 없이 ready VOD 목록/상세 진입 smoke 테스트 추가
 * 2026.05.26  임도헌   Modified  다시보기 탭/카드 이름 중복과 상세 진입 타이밍을 고려해 locator와 href 검증 보강
 */

import { expect, test } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

const E2E_VOD_TITLE = "[E2E] 다시보기 회귀 방송";

test.describe("seeded stream vod smoke", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("다시보기 목록에서 seed VOD 상세로 진입할 수 있다", async ({ page }) => {
    test.setTimeout(60_000);

    await loginWithEmail(
      page,
      E2E_BUYER,
      `/streams?mode=recordings&keyword=${encodeURIComponent("다시보기 회귀")}`,
      { timeout: 30_000 }
    );

    await expect(
      page.getByRole("link", { name: "다시보기", exact: true })
    ).toBeVisible();

    const vodCard = page.getByRole("link").filter({ hasText: E2E_VOD_TITLE });

    await expect(vodCard).toBeVisible({ timeout: 15_000 });

    const vodHref = await vodCard.getAttribute("href");
    expect(vodHref).toMatch(/^\/streams\/\d+\/recording/);

    await page.goto(vodHref!, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/streams\/\d+\/recording/, {
      timeout: 15_000,
    });

    await expect(
      page.getByRole("heading", { level: 1, name: E2E_VOD_TITLE })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "댓글" })).toBeVisible();
  });
});
