/**
 * File Name : tests/e2e/admin-report-action.spec.ts
 * Description : seed 기반 관리자 신고 처리 E2E 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.26  임도헌   Created   관리자 신고 기각 처리와 대기 목록 제거 E2E 테스트 추가
 * 2026.05.27  임도헌   Modified  로그인 복귀와 신고 검색 URL 이동을 분리하고 처리 UI 오픈 대기 기준 보강
 * 2026.05.27  임도헌   Modified  dev 서버 hydration 타이밍을 고려해 처리 버튼 클릭을 입력 폼 노출까지 재시도
 */

import { expect, type Locator, type Page, test } from "@playwright/test";
import {
  E2E_ADMIN,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

const E2E_REPORT_DESCRIPTION = "[E2E] 관리자 신고 처리 회귀 대상";
const E2E_ADMIN_COMMENT = "[E2E] 신고 기각 처리 확인";

/**
 * 신고 처리 UI가 열릴 때까지 처리 버튼 클릭 재시도
 *
 * dev 서버 첫 렌더에서 테이블은 보이지만 client hydration 전 클릭이 무시될 수 있는 상황 대응
 */
async function openReportActionForm(page: Page, reportRow: Locator) {
  const actionButton = reportRow.getByRole("button", { name: "처리하기" });
  const commentField = page.getByLabel("처리 내용");
  const deadline = Date.now() + 45_000;

  while (Date.now() < deadline) {
    await actionButton.click({ timeout: 5_000 }).catch(() => {});

    if (await commentField.isVisible().catch(() => false)) {
      return commentField;
    }

    await page.waitForTimeout(750);
  }

  await expect(commentField).toBeVisible({ timeout: 1_000 });

  return commentField;
}

test.describe("seeded admin report actions", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("관리자는 대기 신고를 기각하고 목록에서 제거할 수 있다", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    const reportUrl = `/admin/reports?status=PENDING&q=${encodeURIComponent(
      E2E_REPORT_DESCRIPTION
    )}`;

    await loginWithEmail(page, E2E_ADMIN, "/admin/reports", {
      timeout: 45_000,
    });
    await page.goto(reportUrl, { waitUntil: "domcontentloaded" });

    const reportRow = page
      .getByRole("row")
      .filter({ hasText: E2E_REPORT_DESCRIPTION })
      .first();

    await expect(reportRow).toBeVisible({ timeout: 15_000 });
    const commentField = await openReportActionForm(page, reportRow);
    await commentField.fill(E2E_ADMIN_COMMENT);
    await page.getByRole("button", { name: "기각", exact: true }).click();

    await expect(page.getByText("신고를 기각했습니다.")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(E2E_REPORT_DESCRIPTION)).toHaveCount(0, {
      timeout: 15_000,
    });
  });
});
