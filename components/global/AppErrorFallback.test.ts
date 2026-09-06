/**
 * File Name : components/global/AppErrorFallback.test.ts
 * Description : 앱 오류 복구 UI 접근성 계약 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   오류 안내 연결과 재시도·복귀 액션 렌더링 검증
 * 2026.09.05  임도헌   Modified  서버 재조회용 App Router 의존성을 격리한 정적 오류 화면 검증 유지
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import AppErrorFallback from "./AppErrorFallback";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

describe("AppErrorFallback", () => {
  it("오류 안내와 재시도·안전한 복귀 액션을 렌더링한다", () => {
    const error = Object.assign(new Error("database unavailable"), {
      digest: "route-error-91",
    });

    const html = renderToStaticMarkup(
      createElement(AppErrorFallback, { error, reset: vi.fn() })
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain("항해 중 문제가 발생했습니다");
    expect(html).toContain("오류 참조:");
    expect(html).toContain("route-error-91");
    expect(html).toContain(">다시 시도</button>");
    expect(html).toContain('href="/products"');
    expect(html).not.toContain("database unavailable");
  });

  it("화면별 안내와 복귀 경로를 덮어쓸 수 있다", () => {
    const html = renderToStaticMarkup(
      createElement(AppErrorFallback, {
        error: new Error("internal detail"),
        reset: vi.fn(),
        title: "게시글을 불러오지 못했습니다",
        description: "게시글 목록에서 다시 선택해 주세요.",
        fallbackHref: "/posts",
        fallbackLabel: "게시글 목록으로",
      })
    );

    expect(html).toContain("게시글을 불러오지 못했습니다");
    expect(html).toContain("게시글 목록에서 다시 선택해 주세요.");
    expect(html).toContain('href="/posts"');
    expect(html).toContain("게시글 목록으로");
    expect(html).not.toContain("internal detail");
  });
});
