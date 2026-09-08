/**
 * File Name : lib/accessibility.test.ts
 * Description : 사용자 모션 설정 기반 접근성 유틸 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   브라우저 유무와 모션 축소 설정별 스크롤 정책 검증
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getMotionSafeScrollBehavior,
  prefersReducedMotion,
} from "./accessibility";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("accessibility motion policy", () => {
  it("브라우저 밖에서는 모션 축소가 비활성화된 것으로 처리한다", () => {
    expect(prefersReducedMotion()).toBe(false);
    expect(getMotionSafeScrollBehavior()).toBe("smooth");
  });

  it("모션 축소 설정이 활성화되면 즉시 스크롤한다", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: true })),
    });

    expect(prefersReducedMotion()).toBe(true);
    expect(getMotionSafeScrollBehavior()).toBe("auto");
  });

  it("모션 축소 설정이 비활성화되면 부드럽게 스크롤한다", () => {
    vi.stubGlobal("window", {
      matchMedia: vi.fn(() => ({ matches: false })),
    });

    expect(prefersReducedMotion()).toBe(false);
    expect(getMotionSafeScrollBehavior()).toBe("smooth");
  });
});
