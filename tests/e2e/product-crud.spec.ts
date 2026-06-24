/**
 * File Name : tests/e2e/product-crud.spec.ts
 * Description : 상품 등록 폼 E2E 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.26  임도헌   Created   상품 등록 필수 입력 validation 회귀 테스트 추가
 * 2026.05.26  임도헌   Modified  상품 삭제 후 목록 복귀와 삭제 상세 잔상 방지 회귀 테스트 추가
 * 2026.05.26  임도헌   Modified  상세 hydration과 반응형 action role 차이를 고려해 삭제 메뉴 오픈 안정화
 */

import { expect, type Page, test } from "@playwright/test";
import {
  E2E_BUYER,
  E2E_SELLER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

const E2E_DELETE_PRODUCT_TITLE = "[E2E] 상품 삭제 복귀 테스트";

/**
 * 상품 상세 owner 메뉴에서 삭제 액션을 열어 반환
 *
 * dev 서버 첫 로드에서 상세 client component hydration 전 클릭이 무시될 수 있는 상황 대응
 */
async function openProductOwnerDeleteAction(page: Page) {
  const menuButton = page.getByLabel("상품 관리 메뉴 열기");
  const deleteAction = page
    .getByRole("menuitem", { name: "삭제하기" })
    .or(page.getByRole("button", { name: "삭제하기" }))
    .first();

  await expect(menuButton).toBeVisible({ timeout: 15_000 });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await menuButton.click();
    try {
      await expect(deleteAction).toBeVisible({ timeout: 3_000 });
      return deleteAction;
    } catch {
      await page.waitForTimeout(500);
    }
  }

  await expect(deleteAction).toBeVisible({ timeout: 5_000 });
  return deleteAction;
}

test.describe("seeded product crud regressions", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("상품 등록 폼은 필수 입력 오류를 보여준다", async ({ page }) => {
    test.setTimeout(60_000);

    await loginWithEmail(page, E2E_BUYER, "/products/add");

    await expect(page.getByPlaceholder("제품명을 입력해주세요")).toBeVisible();
    await page.getByRole("button", { name: "등록하기" }).click();

    await expect(page.getByText("제목을 입력해주세요.").first()).toBeVisible();
    await expect(page.getByText("가격을 입력해주세요.").first()).toBeVisible();
    await expect(
      page.getByText("카테고리를 선택해주세요.").first()
    ).toBeVisible();
    await expect(
      page.getByText("최소 1개 이상의 이미지를 업로드해주세요.").first()
    ).toBeVisible();
  });

  test("상품 삭제 후 목록 복귀는 삭제된 상세 UI를 남기지 않는다", async ({
    page,
  }) => {
    test.setTimeout(60_000);

    await loginWithEmail(page, E2E_SELLER, "/products");

    const productCard = page
      .getByRole("link")
      .filter({ hasText: E2E_DELETE_PRODUCT_TITLE })
      .first();

    await expect(productCard).toBeVisible({ timeout: 15_000 });

    const href = await productCard.getAttribute("href");
    expect(href).toMatch(/^\/products\/view\/\d+/);

    await page.goto(`${href}?returnTo=${encodeURIComponent("/products")}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("heading", { name: E2E_DELETE_PRODUCT_TITLE })
    ).toBeVisible({ timeout: 15_000 });

    const deleteAction = await openProductOwnerDeleteAction(page);

    await deleteAction.click();
    await expect(
      page.getByRole("alertdialog", { name: "제품을 삭제할까요?" })
    ).toBeVisible();
    await page.getByRole("button", { name: "삭제" }).click();

    await page.waitForURL((url) => url.pathname === "/products", {
      timeout: 15_000,
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(E2E_DELETE_PRODUCT_TITLE)).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});
