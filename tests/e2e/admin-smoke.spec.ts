/**
 * File Name : tests/e2e/admin-smoke.spec.ts
 * Description : 관리자 권한과 기본 운영 화면 E2E smoke 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.26  임도헌   Created   seed 관리자 계정 기반 관리자 대시보드/신고 화면 smoke 테스트 추가
 * 2026.05.26  임도헌   Modified  관리자 대시보드 로드 시간과 ADMIN_ONLY 403 정책에 맞춰 기대값 보정
 * 2026.05.27  임도헌   Modified  ADMIN_ONLY redirect 대기를 domcontentloaded 기준으로 맞춰 E2E flake 완화
 * 2026.09.05  임도헌   Modified  관리자 전용 접근 거부 화면의 실제 제목 검증 반영
 */

import { expect, test } from "@playwright/test";
import {
  E2E_ADMIN,
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
  submitEmailLogin,
} from "./helpers/e2eAuth";

test.describe("seeded admin smoke", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("관리자 계정은 대시보드 핵심 지표를 확인할 수 있다", async ({
    page,
  }) => {
    await loginWithEmail(page, E2E_ADMIN, "/admin", { timeout: 30_000 });

    await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
    await expect(page.getByText("총 회원 수")).toBeVisible();
    await expect(page.getByText("처리 대기 신고")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "신고 관리" }).first()
    ).toBeVisible();
  });

  test("관리자 계정은 신고 관리 화면에 진입할 수 있다", async ({ page }) => {
    await loginWithEmail(page, E2E_ADMIN, "/admin/reports");

    await expect(
      page.getByRole("heading", { name: "신고 관리" })
    ).toBeVisible();
    await expect(
      page.getByText("접수된 신고를 검토하고 조치 내용을 기록하세요.")
    ).toBeVisible();
    await expect(page.getByText("신규 Pending")).toBeVisible();
  });

  test("일반 계정은 관리자 화면에 남을 수 없다", async ({ page }) => {
    await submitEmailLogin(page, E2E_BUYER, "/admin");

    await page.waitForURL((url) => url.pathname === "/403", {
      timeout: 15_000,
      waitUntil: "domcontentloaded",
    });
    const currentUrl = new URL(page.url());

    expect(currentUrl.pathname).toBe("/403");
    expect(currentUrl.searchParams.get("reason")).toBe("ADMIN_ONLY");
    expect(currentUrl.searchParams.get("callbackUrl")).toBe("/admin");
    await expect(
      page.getByRole("heading", { name: "관리자 권한이 필요합니다" })
    ).toBeVisible();
    await expect(
      page.getByText("관리자 권한이 있는 계정만 접근할 수 있는 영역입니다.")
    ).toBeVisible();
  });
});
