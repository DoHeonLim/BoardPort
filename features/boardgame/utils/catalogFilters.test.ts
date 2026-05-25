/**
 * File Name : features/boardgame/utils/catalogFilters.test.ts
 * Description : 보드게임 도감 필터 정규화와 목록 URL 생성 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   도감 검색/필터 query 정규화와 페이지 링크 생성 테스트 추가
 */

import { describe, expect, it } from "vitest";
import {
  buildBoardGameListHref,
  parseBoardGameCatalogFilters,
} from "./catalogFilters";

describe("boardgame catalog filters", () => {
  it("URL query를 허용된 카탈로그 필터로 정규화한다", () => {
    expect(
      parseBoardGameCatalogFilters({
        q: "  스플렌더  ",
        players: "two",
        playTime: "standard",
        weight: "medium",
        sort: "rating",
      })
    ).toEqual({
      query: "스플렌더",
      players: "two",
      playTime: "standard",
      weight: "medium",
      sort: "rating",
    });
  });

  it("허용되지 않은 필터 값은 버리고 기본 정렬은 rank로 둔다", () => {
    expect(
      parseBoardGameCatalogFilters({
        q: "   ",
        players: "duo",
        playTime: "forever",
        weight: "extreme",
        sort: "random",
      })
    ).toEqual({ sort: "rank" });
  });

  it("필터와 페이지를 유지한 목록 URL을 생성한다", () => {
    expect(
      buildBoardGameListHref(3, {
        query: "테라포밍",
        players: "threeFour",
        playTime: "long",
        weight: "heavy",
        sort: "popular",
      })
    ).toBe(
      "/boardgames?page=3&q=%ED%85%8C%EB%9D%BC%ED%8F%AC%EB%B0%8D&players=threeFour&playTime=long&weight=heavy&sort=popular"
    );
  });

  it("첫 페이지와 기본 정렬은 URL query에서 생략한다", () => {
    expect(buildBoardGameListHref(1, { sort: "rank" })).toBe("/boardgames");
  });
});
