// @vitest-environment jsdom
/**
 * File Name : components/global/DetailHistoryRefresh.test.tsx
 * Description : 상세 방문 기록 복원 시 서버 갱신 및 비대상 경로·중복 이벤트 제외 검증
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.05  임도헌   Created   게시글·상품·다시보기 history/BFCache 복원 회귀 테스트
 */
// jsdom에서 복원 이벤트와 refresh 호출 경계 검증. 실제 브라우저의 삭제 후 미존재 화면은 배포 후 smoke 대상.
import React from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), pathname: "/posts" }));
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => mocks.pathname,
}));
const router = { refresh: mocks.refresh };
import DetailHistoryRefresh from "./DetailHistoryRefresh";

function navigate(path: string) {
  window.history.replaceState({}, "", path);
  mocks.pathname = path;
}
function restore() {
  act(() => window.dispatchEvent(new PopStateEvent("popstate")));
}
function flush() {
  act(() => vi.runAllTimers());
}

describe("DetailHistoryRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    navigate("/posts");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each(["/posts/518", "/products/view/580", "/streams/222/recording"])(
    "%s의 캐시 복원은 서버 가드를 다시 실행하도록 갱신",
    (path) => {
      render(<DetailHistoryRefresh />);
      navigate(path);
      restore();
      flush();
      expect(mocks.refresh).toHaveBeenCalledTimes(1);
    }
  );

  it("상세 경로의 Router 복원이 끝나기 전에는 갱신 보류", () => {
    const view = render(<DetailHistoryRefresh />);
    window.history.replaceState({}, "", "/posts/518");
    restore();
    flush();
    expect(mocks.refresh).not.toHaveBeenCalled();
    mocks.pathname = "/posts/518";
    view.rerender(<DetailHistoryRefresh />);
    flush();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("초기 로딩과 일반 Link 이동에는 추가 갱신 없음", () => {
    navigate("/posts/518");
    const view = render(<DetailHistoryRefresh />);
    navigate("/products/view/580");
    view.rerender(<DetailHistoryRefresh />);
    flush();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it.each([
    "/posts",
    "/posts/518/edit",
    "/products",
    "/streams/222",
    "/streams",
  ])("%s 방문 기록 복원은 제외", (path) => {
    render(<DetailHistoryRefresh />);
    navigate(path);
    restore();
    flush();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("BFCache 복원과 같은 시점의 popstate를 한 번의 갱신으로 처리", () => {
    navigate("/posts/518");
    render(<DetailHistoryRefresh />);
    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true })
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    flush();
    expect(mocks.refresh).toHaveBeenCalledTimes(1);
  });

  it("일반 pageshow는 제외하고 복원 직후 다른 경로로 이동하면 예약 갱신 취소", () => {
    navigate("/posts/518");
    render(<DetailHistoryRefresh />);
    act(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: false })
      )
    );
    flush();
    expect(mocks.refresh).not.toHaveBeenCalled();
    restore();
    navigate("/posts");
    flush();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });

  it("언마운트 시 예약 갱신과 이벤트 구독 해제", () => {
    navigate("/posts/518");
    const view = render(<DetailHistoryRefresh />);
    restore();
    view.unmount();
    restore();
    flush();
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
});
