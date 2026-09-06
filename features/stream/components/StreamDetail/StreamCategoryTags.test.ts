/**
 * File Name : features/stream/components/StreamDetail/StreamCategoryTags.test.ts
 * Description : 방송 카테고리·태그 정적 렌더링 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.28  임도헌   Created   카테고리 표시와 공백·중복 태그 정규화 검증
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import StreamCategoryTags from "./StreamCategoryTags";

describe("StreamCategoryTags", () => {
  it("카테고리와 정규화한 고유 태그를 정적 HTML로 렌더링한다", () => {
    const markup = renderToStaticMarkup(
      createElement(StreamCategoryTags, {
        category: { kor_name: "전략", icon: "♟️" },
        tags: [
          { name: " 협력 " },
          { name: "협력" },
          { name: "" },
          { name: "입문" },
        ],
      })
    );

    expect(markup).toContain("♟️ 전략");
    expect(markup.match(/>#협력<\/span>/g)).toHaveLength(1);
    expect(markup).toContain("#입문");
  });
});
