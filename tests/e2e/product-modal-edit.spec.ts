/**
 * File Name : tests/e2e/product-modal-edit.spec.ts
 * Description : seed 기반 상품 모달 수정/복귀 E2E 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.26  임도헌   Created   상품 목록 모달 상세에서 수정 후 목록 문맥 복귀 검증 추가
 * 2026.08.24  임도헌   Modified  Next.js 16 목록 relay 기반 모달 복귀와 목적 화면 성공 토스트 검증 반영
 */

import { expect, type Page, test } from "@playwright/test";
import {
  E2E_SELLER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

const E2E_MODAL_EDIT_PRODUCT_TITLE = "[E2E] 모달 수정 복귀 상품";

async function openProductOwnerEditAction(page: Page) {
  const menuButton = page.getByLabel("상품 관리 메뉴 열기");
  const editAction = page
    .getByRole("menuitem", { name: "수정하기" })
    .or(page.getByRole("button", { name: "수정하기" }))
    .first();

  await expect(menuButton).toBeVisible({ timeout: 15_000 });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await menuButton.click();
    try {
      await expect(editAction).toBeVisible({ timeout: 3_000 });
      return editAction;
    } catch {
      await page.waitForTimeout(500);
    }
  }

  await expect(editAction).toBeVisible({ timeout: 5_000 });
  return editAction;
}

test.describe("seeded product modal edit regressions", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("상품 모달 상세에서 수정 후 원래 목록 문맥으로 복귀한다", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const listPath = `/products?keyword=${encodeURIComponent("모달 수정 복귀")}`;
    const nextDescription = `[E2E] 모달 수정 복귀 설명 ${Date.now()}`;

    await loginWithEmail(page, E2E_SELLER, listPath, { timeout: 30_000 });

    const productCard = page
      .getByRole("link")
      .filter({ hasText: E2E_MODAL_EDIT_PRODUCT_TITLE })
      .first();

    await expect(productCard).toBeVisible({ timeout: 15_000 });
    await productCard.click();

    const dialog = page.getByRole("dialog", { name: "상품 상세" });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(
      dialog.getByRole("heading", { name: E2E_MODAL_EDIT_PRODUCT_TITLE })
    ).toBeVisible();

    const editAction = await openProductOwnerEditAction(page);
    await editAction.click();

    await page.waitForURL(/\/products\/view\/\d+\/edit/, {
      timeout: 15_000,
      waitUntil: "domcontentloaded",
    });
    expect(new URL(page.url()).searchParams.get("flow")).toBe("modal-edit");

    const descriptionInput = page.getByPlaceholder(
      "상품의 상태, 특이사항 등을 자세히 적어주세요."
    );
    await expect(descriptionInput).toBeVisible({ timeout: 15_000 });
    await descriptionInput.fill(nextDescription);

    await page.getByRole("button", { name: "수정하기" }).click();

    await expect(page.getByText("상품 정보가 수정되었습니다.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    await expect(dialog.getByText(nextDescription)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "닫기" }).click();
    await page.waitForURL(
      (url) =>
        url.pathname === "/products" &&
        url.searchParams.get("keyword") === "모달 수정 복귀",
      { timeout: 15_000, waitUntil: "domcontentloaded" }
    );

    await expect(
      page
        .getByRole("link")
        .filter({ hasText: E2E_MODAL_EDIT_PRODUCT_TITLE })
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });
});
