/**
 * File Name : tests/e2e/post-crud.spec.ts
 * Description : 게시글 CRUD 핵심 흐름 E2E 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   seed 계정 기반 게시글 작성 플로우 테스트 추가
 * 2026.05.25  임도헌   Modified  게시글 제목 입력 selector를 실제 accessible name 기준으로 수정
 * 2026.05.25  임도헌   Modified  정보성 카테고리 기준으로 작성 입력값 구성
 * 2026.05.25  임도헌   Modified  작성 플로우 smoke 범위를 성공 피드백 확인으로 조정
 */

import { expect, test } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

test.describe("seeded post crud regressions", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("게시글 작성 플로우는 성공 피드백을 보여준다", async ({ page }) => {
    const title = `[E2E] 게시글 작성 회귀 ${Date.now()}`;

    await loginWithEmail(page, E2E_BUYER, "/posts/add");

    await page.getByLabel("카테고리").selectOption("LOG");
    await page.getByPlaceholder("제목을 입력해주세요").fill(title);
    await page.getByPlaceholder("내용을 입력해주세요").first().fill(
      "E2E 회귀 테스트에서 작성한 게시글 본문입니다."
    );
    await page.getByRole("button", { name: "게시글 등록" }).click();

    await expect(page.getByText("게시글이 등록되었습니다.")).toBeVisible();
  });
});
