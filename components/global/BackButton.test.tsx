/**
 * File Name : components/global/BackButton.test.tsx
 * Description : 공통 뒤로가기의 방문 기록과 안전한 fallback 선택 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.02  임도헌   Created   인증 복귀 화면의 의미 기반 뒤로가기 우선 동작 검증
 */

// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BackButton from "./BackButton";

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: mocks.back,
    push: mocks.push,
    replace: mocks.replace,
  }),
}));

describe("BackButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["직접 접근한 채팅", "/chat", "/chat"],
    [
      "상품에서 접근한 채팅",
      "/products/view/571?returnTo=%2Fproducts",
      "/products/view/571?returnTo=/products",
    ],
  ])(
    "%s은 브라우저 기록보다 안전한 복귀 경로를 우선한다",
    (_, href, expectedHref) => {
      render(<BackButton fallbackHref={href} preferFallback />);

      fireEvent.click(screen.getByRole("button", { name: "뒤로가기" }));

      expect(mocks.replace).toHaveBeenCalledWith(expectedHref);
      expect(mocks.back).not.toHaveBeenCalled();
      expect(mocks.push).not.toHaveBeenCalled();
    }
  );
});
