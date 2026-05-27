/**
 * File Name : tests/e2e/public-smoke.spec.ts
 * Description : 로그인 전 공개 페이지 smoke 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   메인, 로그인, 오프라인 공개 페이지 진입 smoke 테스트 추가
 */

import { expect, test } from "@playwright/test";

test.describe("public smoke", () => {
  test("로그인 전 메인에서 핵심 CTA를 확인할 수 있다", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /보드게임과 TRPG의/ })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인하기" })).toHaveAttribute(
      "href",
      "/login"
    );
    await expect(
      page.getByRole("link", { name: "새로운 선원으로 등록" })
    ).toHaveAttribute("href", "/create-account");
  });

  test("로그인 페이지가 기본 입력과 보조 링크를 렌더링한다", async ({
    page,
  }) => {
    await page.goto("/login?callbackUrl=https%3A%2F%2Fexample.com%2Fphishing");

    await expect(
      page.getByRole("heading", { name: "항해 준비" })
    ).toBeVisible();
    await expect(page.getByPlaceholder("이메일 주소")).toBeVisible();
    await expect(page.getByPlaceholder("비밀번호")).toBeVisible();

    // 외부 callbackUrl은 로그인 페이지에서 내부 fallback으로 정규화 후 보조 링크에 반영
    await expect(
      page.getByRole("link", { name: "회원가입 하기" })
    ).toHaveAttribute("href", "/create-account?callbackUrl=%2F");
  });

  test("오프라인 fallback 페이지가 재시도 경로를 제공한다", async ({
    page,
  }) => {
    await page.goto("/offline");

    await expect(
      page.getByRole("heading", { name: "항로를 잃었습니다" })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "재시도" })).toHaveAttribute(
      "href",
      "/"
    );
  });
});
