/**
 * File Name : features/post/components/postsDetail/PostDetailStaticContent.test.ts
 * Description : 게시글 상세 정적 콘텐츠 서버 렌더링 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.28  임도헌   Created   제목·본문·태그의 상호작용 없는 정적 렌더링 계약 검증
 */

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PostDetailDescription from "./PostDetailDescription";
import PostDetailTags from "./PostDetailTags";
import PostDetailTitle from "./PostDetailTitle";

describe("post detail static content", () => {
  it("제목과 줄바꿈 본문을 정적 HTML로 렌더링한다", () => {
    const titleMarkup = renderToStaticMarkup(
      createElement(PostDetailTitle, { title: "전략 게임 모임" })
    );
    const descriptionMarkup = renderToStaticMarkup(
      createElement(PostDetailDescription, {
        description: "첫 번째 줄\n두 번째 줄",
      })
    );

    expect(titleMarkup).toContain("<h1");
    expect(titleMarkup).toContain("전략 게임 모임");
    expect(descriptionMarkup).toContain("첫 번째 줄\n두 번째 줄");
  });

  it("태그를 검색 링크로 렌더링한다", () => {
    const markup = renderToStaticMarkup(
      createElement(PostDetailTags, {
        tags: [{ name: "보드게임" }],
      })
    );

    expect(markup).toContain("#보드게임");
    expect(markup).toContain(
      `href="/posts?keyword=${encodeURIComponent("보드게임")}"`
    );
  });
});
