// @vitest-environment jsdom
/**
 * File Name : components/global/AppErrorFallback.interaction.test.tsx
 * Description : 내부 오류 화면의 재시도·복귀 경로·포커스 및 운영 Console 정보 노출 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.05  임도헌   Created   DATA-08·09 통제 환경 회귀 검증
 */
// 실제 route 오류 UI를 사용하고 서버 재조회·reset 호출, 포커스, HTML·Console 출력 경계 검증.
// 실제 서버 오류 해제 후 콘텐츠 복구는 별도 Next.js Production Chromium 통제 검증으로 보완.
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PostError from "@/app/(app)/posts/[id]/error";
import ProductError from "@/app/(app)/products/view/[id]/error";
import StreamError from "@/app/(app)/streams/[id]/error";
const mocks = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));

describe("내부 오류 화면 상호작용", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it.each([
    [PostError, "게시글을 불러오지 못했습니다", "/posts"],
    [ProductError, "상품을 불러오지 못했습니다", "/products"],
    [StreamError, "방송을 불러오지 못했습니다", "/streams"],
  ] as const)(
    "%s 오류의 재시도·문맥별 복귀·민감 정보 은닉",
    (Component, title, href) => {
      // 운영 비밀값 대신 식별 가능한 가짜 오류 원문을 주입해 브라우저 노출 여부 확인.
      const error = Object.assign(
        new Error(
          "SMOKE_PRIVATE_SQL postgresql://fake:fake@localhost/db SMOKE_FAKE_TOKEN"
        ),
        { digest: "123456789" }
      );
      const reset = vi.fn();
      const { container } = render(<Component error={error} reset={reset} />);
      expect(screen.getByRole("heading", { name: title })).toHaveFocus();
      expect(screen.getByRole("link")).toHaveAttribute("href", href);
      fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
      expect(reset).toHaveBeenCalledTimes(1);
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
      expect(container.innerHTML).not.toMatch(
        /SMOKE_PRIVATE_SQL|postgresql:|SMOKE_FAKE_TOKEN/
      );
      const logs = vi
        .mocked(console.error)
        .mock.calls.flat()
        .map((value) =>
          value instanceof Error ? value.stack : JSON.stringify(value)
        )
        .join("\n");
      expect(logs).not.toMatch(
        /SMOKE_PRIVATE_SQL|postgresql:|SMOKE_FAKE_TOKEN/
      );
    }
  );
});
