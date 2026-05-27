/**
 * File Name : tests/e2e/notification-settings.spec.ts
 * Description : 알림 설정 화면 E2E smoke 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.26  임도헌   Created   알림 유형/방해 금지/키워드 관리 설정 화면 렌더링 smoke 테스트 추가
 * 2026.05.26  임도헌   Modified  설정 페이지 서버 렌더 지연을 고려해 로그인 복귀 timeout 보강
 * 2026.05.26  임도헌   Modified  알림 종류/방해 금지 시간 저장 후 재진입 값 유지 E2E 테스트 추가
 */

import { expect, test } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

test.describe("seeded notification settings smoke", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("알림 설정 화면은 유형, 방해 금지 시간, 키워드 관리 진입점을 렌더링한다", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await loginWithEmail(
      page,
      E2E_BUYER,
      "/profile/notifications/setting?returnTo=/profile/notifications/list",
      { timeout: 30_000 }
    );

    await expect(page.getByRole("heading", { name: "알림 설정" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "알림 종류" })).toBeVisible();

    for (const label of [
      "채팅 알림",
      "거래 알림",
      "리뷰 알림",
      "뱃지 알림",
      "방송 알림",
      "키워드 알림",
      "시스템 알림",
    ]) {
      await expect(page.getByLabel(label)).toBeVisible();
    }

    await expect(page.getByLabel("시작 시간")).toBeVisible();
    await expect(page.getByLabel("종료 시간")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "키워드 알림 관리" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "관리하기" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "설정 저장하기" })
    ).toBeVisible();
  });

  test("알림 설정 저장 후 재진입하면 변경값을 유지한다", async ({ page }) => {
    test.setTimeout(60_000);

    const settingsPath =
      "/profile/notifications/setting?returnTo=/profile/notifications/list";

    await loginWithEmail(page, E2E_BUYER, settingsPath, { timeout: 30_000 });

    await page.getByLabel("시스템 알림").uncheck();
    await page.getByLabel("시작 시간").fill("22:30");
    await page.getByLabel("종료 시간").fill("07:15");
    await page.getByRole("button", { name: "설정 저장하기" }).click();

    await page.waitForURL(
      (url) => url.pathname === "/profile/notifications/list",
      {
        timeout: 15_000,
        waitUntil: "domcontentloaded",
      }
    );

    await page.goto(settingsPath, { waitUntil: "domcontentloaded" });

    await expect(page.getByLabel("시스템 알림")).not.toBeChecked();
    await expect(page.getByLabel("시작 시간")).toHaveValue("22:30");
    await expect(page.getByLabel("종료 시간")).toHaveValue("07:15");
  });
});
