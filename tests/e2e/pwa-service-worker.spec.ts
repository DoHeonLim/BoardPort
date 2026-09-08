/**
 * File Name : tests/e2e/pwa-service-worker.spec.ts
 * Description : Production 서비스 워커 문서 fallback 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.30  임도헌   Created   실제 문서 탐색의 offline fallback과 no-response 오류 부재 검증
 */

import { expect, test } from "@playwright/test";

test.describe("production service worker", () => {
  test.skip(
    process.env.E2E_EXPECT_SERVICE_WORKER !== "1",
    "서비스 워커가 등록되는 Production build에서만 실행한다."
  );

  test("오프라인 문서 탐색은 안내 화면으로 복구되고 no-response를 남기지 않는다", async ({
    context,
    page,
  }) => {
    const serviceWorkerErrors: string[] = [];
    page.on("console", (message) => {
      if (
        message.type() === "error" &&
        message.text().includes("no-response")
      ) {
        serviceWorkerErrors.push(message.text());
      }
    });

    await page.goto("/");
    await page.waitForFunction(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.active?.state === "activated";
    });

    if (
      !(await page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    ) {
      await page.reload();
      await page.waitForFunction(() =>
        Boolean(navigator.serviceWorker.controller)
      );
    }

    await context.setOffline(true);
    try {
      await page.goto("/create-account?callbackUrl=%2Fprofile", {
        waitUntil: "domcontentloaded",
      });

      await expect(
        page.getByRole("heading", { name: "항로를 잃었습니다" })
      ).toBeVisible();
      expect(serviceWorkerErrors).toEqual([]);
    } finally {
      await context.setOffline(false);
    }
  });
});
