/**
 * File Name : components/global/SkipLink.test.ts
 * Description : 공통 본문 바로가기 링크 정적 렌더링 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   본문 대상과 키보드 포커스 노출 계약 검증
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SkipLink from "./SkipLink";

describe("SkipLink", () => {
  it("공통 본문 대상으로 이동하는 한국어 링크를 렌더링한다", () => {
    const markup = renderToStaticMarkup(createElement(SkipLink));

    expect(markup).toContain('href="#main-content"');
    expect(markup).toContain("본문으로 건너뛰기");
    expect(markup).toContain("sr-only");
    expect(markup).toContain("focus:not-sr-only");
  });
});
