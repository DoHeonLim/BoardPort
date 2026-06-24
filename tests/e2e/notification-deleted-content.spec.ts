/**
 * File Name : tests/e2e/notification-deleted-content.spec.ts
 * Description : 삭제된 콘텐츠 알림 표시 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   hard delete 이후 알림 이동 버튼과 안내 문구 회귀 테스트 추가
 * 2026.05.25  임도헌   Modified  정상 콘텐츠 알림의 보기 CTA 노출 회귀 테스트 추가
 * 2026.05.25  임도헌   Modified  seeded DB 상태 의존도를 줄이기 위해 정상 알림은 CTA 노출 범위로 검증
 */

import { expect, test } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

test.describe("seeded notification regressions", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("삭제된 상품 알림은 이동 버튼 없이 안내 문구를 보여준다", async ({
    page,
  }) => {
    await loginWithEmail(
      page,
      E2E_BUYER,
      "/profile/notifications/list?filter=TRADE"
    );

    await expect(
      page.getByRole("heading", { name: "알림 센터" })
    ).toBeVisible();

    const availableItem = page
      .getByRole("listitem")
      .filter({ hasText: "[E2E] 상품 알림" });
    const deletedItem = page
      .getByRole("listitem")
      .filter({ hasText: "[E2E] 삭제된 상품 알림" });

    await expect(
      availableItem.getByRole("button", { name: /보기/ })
    ).toBeVisible();
    await expect(deletedItem).toContainText(
      "연결된 콘텐츠가 삭제되어 이동할 수 없습니다."
    );
    await expect(deletedItem.getByRole("button", { name: /보기/ })).toHaveCount(
      0
    );
  });

  test("정상 상품 알림은 보기 버튼을 표시한다", async ({
    page,
  }) => {
    await loginWithEmail(
      page,
      E2E_BUYER,
      "/profile/notifications/list?filter=TRADE"
    );

    const availableItem = page
      .getByRole("listitem")
      .filter({ hasText: "[E2E] 상품 알림" });

    await expect(
      availableItem.getByRole("button", { name: /보기/ })
    ).toBeVisible();
  });
});
