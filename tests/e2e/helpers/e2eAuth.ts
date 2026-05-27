/**
 * File Name : tests/e2e/helpers/e2eAuth.ts
 * Description : Playwright E2E 로그인 보조 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   seed 기반 E2E 테스트에서 사용할 로그인 헬퍼 추가
 * 2026.05.26  임도헌   Modified  판매자 권한 기반 삭제/약속 수락 E2E를 위한 seller 계정 헬퍼 추가
 * 2026.05.26  임도헌   Modified  redirect 성공/실패 검증용 제출 헬퍼와 callbackUrl 비교 기준 보강
 */

import { expect, type Page } from "@playwright/test";

export const E2E_BUYER = {
  email: "e2e.buyer@boardport.test",
  password: "BoardPort!234",
} as const;

export const E2E_SELLER = {
  email: "e2e.seller@boardport.test",
  password: "BoardPort!234",
} as const;

export const E2E_ADMIN = {
  email: "e2e.admin@boardport.test",
  password: "BoardPort!234",
} as const;

/** seed 데이터가 필요한 E2E 실행 여부 확인 */
export function isSeededE2EEnabled() {
  return process.env.E2E_SEEDED === "1";
}

/**
 * callbackUrl 도착 여부를 URL 객체 기준으로 비교
 *
 * 브라우저 query 재직렬화로 `%5BE2E%5D`와 `[E2E]`처럼 문자열만 달라지는 상황 대응
 */
function isSameCallbackUrl(actual: URL, expectedPath: string) {
  const expected = new URL(expectedPath, actual.origin);
  return (
    actual.pathname === expected.pathname &&
    actual.searchParams.toString() === expected.searchParams.toString()
  );
}

/**
 * 이메일/비밀번호 로그인 폼 제출
 *
 * callbackUrl 도착 여부는 호출 테스트에서 검증
 */
export async function submitEmailLogin(
  page: Page,
  user: { email: string; password: string },
  callbackUrl: string
) {
  await page.goto(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  await page.getByPlaceholder("이메일 주소").fill(user.email);
  await page.getByPlaceholder("비밀번호").fill(user.password);
  await page.getByRole("button", { name: "로그인" }).click();
}

/**
 * 이메일/비밀번호로 로그인한 뒤 callbackUrl로 복귀했는지 확인
 *
 * seed 기반 E2E의 보호 화면 진입 과정 통일
 */
export async function loginWithEmail(
  page: Page,
  user: { email: string; password: string },
  callbackUrl: string,
  options: { timeout?: number } = {}
) {
  await submitEmailLogin(page, user, callbackUrl);

  await page.waitForURL(
    (url) => isSameCallbackUrl(url, callbackUrl),
    { timeout: options.timeout ?? 30_000, waitUntil: "domcontentloaded" }
  );

  const currentUrl = new URL(page.url());
  expect(isSameCallbackUrl(currentUrl, callbackUrl)).toBe(true);
}
