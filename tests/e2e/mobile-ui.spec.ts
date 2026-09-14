/**
 * File Name : tests/e2e/mobile-ui.spec.ts
 * Description : 모바일 목록 배치와 바텀시트 조작 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.14  임도헌   Created   화면 너비별 목록 배치·보기 전환·시트 포커스 및 스크롤 복원 검증
 */

import { expect, test, type Locator, type Page } from "@playwright/test";
import {
  E2E_BUYER,
  isSeededE2EEnabled,
  loginWithEmail,
} from "./helpers/e2eAuth";

const WIDTHS = [360, 427, 559, 560, 634, 640, 768];

/** 문서 가로 넘침 검증 */
async function expectNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth
      )
    )
    .toBeLessThanOrEqual(1);
}

/** 도구별 화면 내 배치와 상호 겹침 검증 */
async function expectSeparatedControls(page: Page, controls: Locator[]) {
  for (const control of controls) await expect(control).toBeVisible();
  await expect
    .poll(async () => {
      const boxes = await Promise.all(
        controls.map((control) => control.boundingBox())
      );
      const width = page.viewportSize()!.width;
      return boxes.every(
        (box, index) =>
          box &&
          box.width > 0 &&
          box.height > 0 &&
          box.x >= -1 &&
          box.x + box.width <= width + 1 &&
          boxes
            .slice(index + 1)
            .every(
              (other) =>
                other &&
                (box.x + box.width <= other.x + 1 ||
                  other.x + other.width <= box.x + 1 ||
                  box.y + box.height <= other.y + 1 ||
                  other.y + other.height <= box.y + 1)
            )
      );
    })
    .toBe(true);
}

test.describe("seeded mobile UI regressions", () => {
  test.use({ viewport: { width: 427, height: 900 }, hasTouch: true });
  test.skip(!isSeededE2EEnabled(), "E2E_SEEDED=1과 E2E seed 데이터 필요");

  for (const { path, label, cardSelector } of [
    {
      path: "/products",
      label: "상품",
      cardSelector: 'a[data-card-link][href^="/products/view/"]',
    },
    { path: "/posts", label: "게시글", cardSelector: 'a[href^="/posts/"]' },
  ]) {
    test(`${label} 목록은 모바일·태블릿에서 도구가 겹치지 않고 보기 전환을 유지한다`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await loginWithEmail(page, E2E_BUYER, path);
      const sort = page.getByRole("combobox", { name: `${label} 정렬` });
      const toggle = page.getByRole("group", {
        name: `${label} 목록 보기 방식`,
      });
      const count = page.getByText(new RegExp(`^총\\s*\\d+개의\\s*${label}$`));
      const catalog = page.getByRole("link", {
        name: "보드게임 도감",
        exact: true,
      });
      const cards = page.locator(cardSelector);
      const card = (
        path === "/posts" ? cards.filter({ has: page.locator("h2") }) : cards
      ).first();
      const sortBox = sort.locator("..");

      for (const width of WIDTHS) {
        await test.step(`${width}px 배치`, async () => {
          await page.setViewportSize({ width, height: 900 });
          await expectSeparatedControls(page, [
            count,
            sortBox,
            toggle,
            ...(path === "/products" ? [catalog] : []),
          ]);
          await expectNoHorizontalOverflow(page);
          for (const control of [
            sort,
            ...(await toggle.getByRole("button").all()),
          ]) {
            const box = await control.boundingBox();
            expect(box?.height).toBeGreaterThanOrEqual(44);
            expect(box?.width).toBeGreaterThanOrEqual(44);
          }
          // 560px 미만의 두 줄 배치와 이상 구간의 한 줄 배치 유지
          await expect
            .poll(async () => {
              const a = await count.boundingBox();
              const b = await sortBox.boundingBox();
              if (!a || !b) return false;
              return width < 560
                ? b.y >= a.y + a.height
                : Math.abs(a.y + a.height / 2 - b.y - b.height / 2) < 4;
            })
            .toBe(true);
          if (path === "/products" && width < 560) {
            await expect
              .poll(async () => {
                const a = await catalog.boundingBox();
                const b = await count.boundingBox();
                return a && b
                  ? Math.abs(a.y + a.height / 2 - b.y - b.height / 2)
                  : Infinity;
              })
              .toBeLessThan(4);
          }
        });
      }

      await page.setViewportSize({ width: 427, height: 900 });
      for (const mode of ["grid", "list"] as const) {
        await toggle
          .getByRole("button", {
            name: mode === "grid" ? "그리드 보기" : "리스트 보기",
          })
          .click();
        await expect(
          toggle.getByRole("button", {
            name: mode === "grid" ? "그리드 보기" : "리스트 보기",
          })
        ).toHaveAttribute("aria-pressed", "true");
        await expect(page).toHaveURL(
          (url) => (url.searchParams.get("view") ?? "list") === mode
        );
        await expect(card).toBeVisible();
        // 외부 이미지 다운로드 성공 여부와 독립적으로 썸네일 영역의 높이 0 회귀 검증
        await expect
          .poll(() =>
            card
              .locator(":scope > div")
              .first()
              .evaluate((element) => element.getBoundingClientRect().height)
          )
          .toBeGreaterThan(40);
        await expect
          .poll(async () => {
            const image = await card
              .locator(":scope > div")
              .first()
              .boundingBox();
            const content = await card
              .locator(":scope > div")
              .nth(1)
              .boundingBox();
            if (!image || !content) return false;
            return mode === "grid"
              ? content.y >= image.y + image.height - 1
              : content.x >= image.x + image.width - 1;
          })
          .toBe(true);
        await expectNoHorizontalOverflow(page);
        await page.reload();
        await expect(
          toggle.getByRole("button", {
            name: mode === "grid" ? "그리드 보기" : "리스트 보기",
          })
        ).toHaveAttribute("aria-pressed", "true");
      }
    });
  }

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`카테고리 시트는 포커스와 스크롤을 복원한다 (${reducedMotion})`, async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion });
      await loginWithEmail(page, E2E_BUYER, "/products");
      const trigger = page.getByRole("button", { name: "카테고리 분류 선택" });
      const dialog = page.getByRole("dialog", {
        name: "카테고리 선택",
        exact: true,
      });
      const original = await page.evaluate(() => ({
        body: document.body.style.overflow,
        html: document.documentElement.style.overflow,
        position: document.body.style.position,
      }));

      // 키보드로 연 뒤 역방향·정방향 Tab 순환, Escape 닫기 검증
      await trigger.focus();
      await trigger.press("Enter");
      await expect(dialog).toBeVisible();
      const close = dialog.getByRole("button", { name: "시트 닫기" });
      await expect(close).toBeFocused();
      await expect
        .poll(() => page.evaluate(() => document.body.style.overflow))
        .toBe("hidden");
      const last = dialog.getByRole("button").last();
      await page.keyboard.press("Shift+Tab");
      await expect(last).toBeFocused();
      await page.keyboard.press("Tab");
      await expect(close).toBeFocused();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(trigger).toBeFocused();

      // 터치로 재진입 후 닫기 버튼 조작 검증
      await trigger.tap();
      await expect(close).toBeVisible();
      await close.tap();
      await expect(dialog).toHaveCount(0);
      await expect
        .poll(() =>
          page.evaluate(() => ({
            body: document.body.style.overflow,
            html: document.documentElement.style.overflow,
            position: document.body.style.position,
          }))
        )
        .toEqual(original);
      await expectNoHorizontalOverflow(page);
    });
  }
});
