/**
 * File Name : tests/e2e/chat-smoke.spec.ts
 * Description : seed 기반 채팅 목록/상세 진입 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.26  임도헌   Created   E2E seed 채팅방의 목록 노출과 상세 진입 smoke 테스트 추가
 * 2026.05.26  임도헌   Modified  채팅방 카드 href 검증 후 상세 URL 직접 진입으로 SPA click flake 완화
 */

import { expect, test } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

const E2E_PRODUCT_TITLE = "[E2E] 삭제 복귀 상품";
const E2E_CHAT_MESSAGE = "[E2E] 채팅 목록 회귀 메시지";

test.describe("seeded chat smoke", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("채팅 목록에서 seed 대화를 확인하고 상세로 진입할 수 있다", async ({
    page,
  }) => {
    test.setTimeout(45_000);

    await loginWithEmail(page, E2E_BUYER, "/chat");

    await expect(page.getByRole("heading", { name: "신호" })).toBeVisible();
    await expect(
      page.getByPlaceholder("상대방, 상품, 마지막 대화 검색")
    ).toBeVisible();

    const roomCard = page
      .getByRole("link")
      .filter({ hasText: E2E_PRODUCT_TITLE });

    await expect(roomCard).toBeVisible();
    await expect(roomCard).toContainText(E2E_CHAT_MESSAGE);

    const roomHref = await roomCard.getAttribute("href");
    expect(roomHref).toMatch(/^\/chats\/[^/?#]+$/);

    await page.goto(roomHref!);
    await expect(page).toHaveURL(/\/chats\/[^/?#]+/, { timeout: 15_000 });

    await expect(page.getByText(E2E_PRODUCT_TITLE).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(E2E_CHAT_MESSAGE).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
