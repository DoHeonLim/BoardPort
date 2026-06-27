/**
 * File Name : tests/e2e/stream-follow-access.spec.ts
 * Description : seed 기반 팔로우 후 팔로워 전용 VOD 접근 수렴 E2E 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.26  임도헌   Created   팔로우 후 팔로워 전용 VOD 잠금/목록/상세 접근 수렴 검증 추가
 */

import { expect, test } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

const E2E_FOLLOWERS_VOD_TITLE = "[E2E] 팔로워 전용 회귀 방송";
const E2E_STREAMER_USERNAME = "e2e_seller";

test.describe("seeded stream follow access regressions", () => {
  test.skip(
    !isSeededE2EEnabled(),
    "npm run seed:e2e 실행 후 E2E_SEEDED=1일 때만 seed 기반 테스트를 실행합니다."
  );

  test("팔로우 후 팔로워 전용 VOD 잠금과 팔로잉 목록이 수렴한다", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await loginWithEmail(
      page,
      E2E_BUYER,
      `/profile/${E2E_STREAMER_USERNAME}/channel`,
      { timeout: 30_000 }
    );

    const channelVodCard = page
      .getByRole("link")
      .filter({ hasText: E2E_FOLLOWERS_VOD_TITLE })
      .first();

    await expect(channelVodCard).toBeVisible({ timeout: 15_000 });
    await expect(channelVodCard).toContainText("팔로워 전용 방송입니다");

    const channelFollowButton = page.locator("#channel-follow-button");

    await expect(channelFollowButton).toBeVisible();
    await expect(channelFollowButton).toHaveAttribute("aria-pressed", "false");

    await channelFollowButton.click();

    await expect(channelFollowButton).toHaveAttribute("aria-pressed", "true", {
      timeout: 15_000,
    });
    await expect(channelFollowButton).toHaveText("팔로우 취소");
    await expect(
      channelVodCard.getByText("팔로워 전용 방송입니다")
    ).toHaveCount(0, { timeout: 15_000 });

    await page.goto(
      `/streams?mode=recordings&scope=following&keyword=${encodeURIComponent("팔로워 전용 회귀")}`,
      { waitUntil: "domcontentloaded" }
    );

    const followingVodCard = page
      .getByRole("link")
      .filter({ hasText: E2E_FOLLOWERS_VOD_TITLE })
      .first();

    await expect(followingVodCard).toBeVisible({ timeout: 15_000 });
    await expect(
      followingVodCard.getByText("팔로워 전용 방송입니다")
    ).toHaveCount(0);

    const vodHref = await followingVodCard.getAttribute("href");
    expect(vodHref).toMatch(/^\/streams\/\d+\/recording/);

    await page.goto(vodHref!, { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { level: 1, name: E2E_FOLLOWERS_VOD_TITLE })
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("heading", { name: "댓글" })).toBeVisible();
  });
});
