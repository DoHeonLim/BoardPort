/**
 * File Name : playwright.config.ts
 * Description : Playwright E2E 테스트 설정
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.24  임도헌   Created   브라우저 smoke/E2E 회귀 테스트용 Playwright 설정 추가
 * 2026.07.24  임도헌   Modified  CI/로컬 실행에서 PLAYWRIGHT_BASE_URL을 공통 기준으로 사용
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  // seed 기반 테스트의 같은 DB 상태 공유를 고려한 순차 실행 기본값
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    // CI/사용자 지정 주소를 우선하고 로컬 dev:e2e 주소를 fallback으로 사용
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
    // 실패 재시도 시에만 trace를 남겨 원인 분석 비용 절감
    trace: "on-first-retry",
  },
  projects: [
    {
      // 1차 회귀 테스트는 Chromium 기준 고정, 브라우저 매트릭스는 필요 시 확장
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
