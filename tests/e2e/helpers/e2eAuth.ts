/**
 * File Name : tests/e2e/helpers/e2eAuth.ts
 * Description : Playwright E2E 로그인 보조 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   seed 기반 E2E 테스트에서 사용할 로그인 헬퍼 추가
 */

import { expect, type Page } from "@playwright/test";

export const E2E_BUYER = {
  email: "e2e.buyer@boardport.test",
  password: "BoardPort!234",
} as const;

export function isSeededE2EEnabled() {
  return process.env.E2E_SEEDED === "1";
}

/**
 * 이메일/비밀번호로 로그인한 뒤 callbackUrl로 복귀했는지 확인
 *
 * seed 기반 E2E는 로그인 이후의 보호 화면을 검증하므로 이 헬퍼로 진입 과정을 통일한다.
 */
export async function loginWithEmail(
  page: Page,
  user: { email: string; password: string },
  callbackUrl: string
) {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByPlaceholder("이메일 주소").fill(user.email);
  await page.getByPlaceholder("비밀번호").fill(user.password);
  await page.getByRole("button", { name: "로그인" }).click();

  await page.waitForURL(
    (url) => `${url.pathname}${url.search}` === callbackUrl,
    { timeout: 15_000 }
  );

  const currentUrl = new URL(page.url());
  expect(`${currentUrl.pathname}${currentUrl.search}`).toBe(callbackUrl);
}
