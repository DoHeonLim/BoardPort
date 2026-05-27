/**
 * File Name : tests/e2e/post-crud.spec.ts
 * Description : 게시글 CRUD 핵심 흐름 E2E 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   seed 계정 기반 게시글 작성 플로우 테스트 추가
 * 2026.05.25  임도헌   Modified  실제 입력 label/placeholder와 정보성 카테고리 기준으로 작성 입력값 정리
 * 2026.05.26  임도헌   Modified  게시글 삭제 후 목록 복귀 mixed tree 회귀 테스트 추가
 * 2026.05.26  임도헌   Modified  삭제 후 문서 reload를 고려해 목록 복귀 결과와 삭제 상세 잔상 여부 검증
 * 2026.05.27  임도헌   Modified  작성 성공 후 상세 redirect 지연 시 목록에서 생성 글 경로를 재조회하도록 보강
 */

import { expect, type Page, test } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

/**
 * 게시글 목록에서 방금 작성한 글의 상세 경로 조회
 *
 * 작성 성공 toast가 먼저 보이고 상세 redirect가 늦을 수 있는 상황의 목록 링크 fallback
 */
async function findPostPathFromList(page: Page, title: string) {
  await page.goto("/posts", { waitUntil: "domcontentloaded" });

  const postLink = page.getByRole("link").filter({ hasText: title }).first();

  await expect(postLink).toBeVisible({ timeout: 15_000 });

  const href = await postLink.getAttribute("href");

  expect(href).toMatch(/^\/posts\/\d+/);

  return new URL(href!, "http://127.0.0.1:3000").pathname;
}

/**
 * 게시글 작성 E2E 입력 흐름을 공통화
 *
 * 작성 성공 toast 확인 후 상세 redirect 지연 시 목록에서 상세 경로 재조회
 */
async function createPostByUi(page: Page, title: string) {
  await page.getByLabel("카테고리").selectOption("LOG");
  await page.getByPlaceholder("제목을 입력해주세요").fill(title);
  await page
    .getByPlaceholder("내용을 입력해주세요")
    .first()
    .fill("E2E 회귀 테스트에서 작성한 게시글 본문입니다.");
  await page.getByRole("button", { name: "게시글 등록" }).click();

  await expect(page.getByText("게시글이 등록되었습니다.")).toBeVisible();

  try {
    await page.waitForURL(/\/posts\/\d+$/, { timeout: 15_000 });
    return new URL(page.url()).pathname;
  } catch {
    return findPostPathFromList(page, title);
  }
}

test.describe("seeded post crud regressions", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("게시글 작성 플로우는 성공 피드백을 보여준다", async ({ page }) => {
    const title = `[E2E] 게시글 작성 회귀 ${Date.now()}`;

    await loginWithEmail(page, E2E_BUYER, "/posts/add");

    await createPostByUi(page, title);
  });

  test("게시글 삭제 후 목록 복귀는 삭제된 상세 UI를 남기지 않는다", async ({
    page,
  }) => {
    test.setTimeout(45_000);

    const title = `[E2E] 게시글 삭제 복귀 ${Date.now()}`;

    await loginWithEmail(page, E2E_BUYER, "/posts/add");
    const postPath = await createPostByUi(page, title);

    // 목록 문맥에서 상세로 진입한 히스토리 구성, 새 글 목록 반영 타이밍 의존 제거
    await page.goto("/posts");
    await page.goto(`${postPath}?returnTo=${encodeURIComponent("/posts")}`);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.getByLabel("게시글 관리 메뉴 열기").click();
    await page.getByRole("menuitem", { name: "삭제하기" }).click();
    await expect(
      page.getByRole("alertdialog", { name: "게시글을 삭제할까요?" })
    ).toBeVisible();
    await page.getByRole("button", { name: "삭제" }).click();

    await page.waitForURL((url) => url.pathname === "/posts", {
      timeout: 15_000,
      waitUntil: "domcontentloaded",
    });
    await expect(page.getByText(title)).toHaveCount(0, { timeout: 15_000 });
  });
});
