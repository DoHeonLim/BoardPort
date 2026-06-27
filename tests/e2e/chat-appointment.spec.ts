/**
 * File Name : tests/e2e/chat-appointment.spec.ts
 * Description : seed 기반 채팅 약속 수락 E2E 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.26  임도헌   Created   채팅 약속 수락과 상품 예약 전환 성공 피드백 E2E 테스트 추가
 * 2026.06.26  임도헌   Modified  약속 수락 후 상품 예약 상태가 목록/상세에 유지되는지 검증 추가
 */

import { expect, test } from "@playwright/test";
import {
  E2E_SELLER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

const E2E_APPOINTMENT_PRODUCT_TITLE = "[E2E] 약속 수락 상품";

test.describe("seeded chat appointment regressions", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("채팅 약속을 수락하면 확정 상태와 상품 예약 상태가 유지된다", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await loginWithEmail(page, E2E_SELLER, "/chat");

    const roomCard = page
      .getByRole("link")
      .filter({ hasText: E2E_APPOINTMENT_PRODUCT_TITLE })
      .first();

    await expect(roomCard).toBeVisible({ timeout: 15_000 });

    const roomHref = await roomCard.getAttribute("href");
    expect(roomHref).toMatch(/^\/chats\/[^/?#]+$/);

    await page.goto(roomHref!, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/chats\/[^/?#]+/, { timeout: 15_000 });
    await expect(page.getByText(E2E_APPOINTMENT_PRODUCT_TITLE).first())
      .toBeVisible({ timeout: 15_000 });

    await page.getByRole("button", { name: "수락하기" }).click();

    await expect(
      page.getByText("약속을 수락했습니다! 상품이 예약됩니다.")
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("확정됨").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText("확정됨").first()).toBeVisible({
      timeout: 15_000,
    });

    await page.goto(
      `/products?keyword=${encodeURIComponent("약속 수락 상품")}`,
      { waitUntil: "domcontentloaded" }
    );

    const productCard = page
      .getByRole("link")
      .filter({ hasText: E2E_APPOINTMENT_PRODUCT_TITLE })
      .first();

    await expect(productCard).toBeVisible({ timeout: 15_000 });
    await expect(productCard).toContainText(/예약\s*중|예약중/);

    const productHref = await productCard.getAttribute("href");
    expect(productHref).toMatch(/^\/products\/view\/\d+/);

    await page.goto(productHref!, { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: E2E_APPOINTMENT_PRODUCT_TITLE })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/예약\s*중|예약중/).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
