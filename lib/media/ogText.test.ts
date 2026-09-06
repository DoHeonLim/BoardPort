/**
 * File Name : lib/media/ogText.test.ts
 * Description : 동적 OG 이미지의 고정 폭 텍스트 줄바꿈 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.09.01  임도헌   Created   공백 없는 긴 제목·말줄임표·빈 문구 폴백 검증
 */

import { describe, expect, it } from "vitest";
import { splitOgTextLines } from "./ogText";

describe("splitOgTextLines", () => {
  it("공백 없는 긴 상품 제목을 지정한 폭 안에서 여러 줄로 나눈다", () => {
    expect(
      splitOgTextLines("SMOKE-V130-BASE-상품-수정", 14, 2, "BoardPort")
    ).toEqual(["SMOKE-V130-BAS", "E-상품-수정"]);
  });

  it("최대 줄 수를 넘는 내용은 마지막 줄에 말줄임표를 붙인다", () => {
    const lines = splitOgTextLines(
      "공백 없는 아주 긴 제목도 카드 영역 밖으로 나가지 않습니다",
      10,
      2,
      "BoardPort"
    );

    expect(lines).toHaveLength(2);
    expect(lines.every((line) => Array.from(line).length <= 10)).toBe(true);
    expect(lines.at(-1)).toMatch(/\.\.\.$/);
  });

  it("빈 내용은 지정한 기본 문구로 대체한다", () => {
    expect(splitOgTextLines("   ", 10, 2, "BoardPort")).toEqual(["BoardPort"]);
  });
});
