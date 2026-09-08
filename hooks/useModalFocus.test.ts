/**
 * File Name : hooks/useModalFocus.test.ts
 * Description : 모달 Tab 포커스 순환 결정 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   정방향·역방향 경계와 모달 외부 포커스 복구 대상 검증
 */

import { describe, expect, it } from "vitest";
import { resolveModalTabTarget } from "./useModalFocus";

const focusableElements = ["first", "middle", "last"];

describe("resolveModalTabTarget", () => {
  it("마지막 요소에서 Tab을 누르면 첫 요소로 순환한다", () => {
    expect(resolveModalTabTarget(focusableElements, "last", false, true)).toBe(
      "first"
    );
  });

  it("첫 요소에서 Shift+Tab을 누르면 마지막 요소로 순환한다", () => {
    expect(resolveModalTabTarget(focusableElements, "first", true, true)).toBe(
      "last"
    );
  });

  it("모달 밖 포커스는 Tab 방향에 맞는 경계로 복구한다", () => {
    expect(resolveModalTabTarget(focusableElements, null, false, false)).toBe(
      "first"
    );
    expect(resolveModalTabTarget(focusableElements, null, true, false)).toBe(
      "last"
    );
  });

  it("컨테이너처럼 Tab 목록에 없는 내부 포커스도 방향별 경계로 이동한다", () => {
    expect(
      resolveModalTabTarget(focusableElements, "container", false, true)
    ).toBe("first");
    expect(
      resolveModalTabTarget(focusableElements, "container", true, true)
    ).toBe("last");
  });

  it("모달 내부 중간 요소에서는 브라우저 기본 이동을 유지한다", () => {
    expect(
      resolveModalTabTarget(focusableElements, "middle", false, true)
    ).toBeNull();
  });
});
