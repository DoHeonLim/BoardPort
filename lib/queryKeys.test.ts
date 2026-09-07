/**
 * File Name : lib/queryKeys.test.ts
 * Description : 개인화 TanStack Query key 분리 규칙 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.13  임도헌   Created   조회자·지역·사용자별 cache key 격리 회귀 테스트 추가
 */

import { describe, expect, it } from "vitest";
import { queryKeys } from "@/lib/queryKeys";

describe("queryKeys personalized cache scopes", () => {
  it("separates product feeds by viewer and complete region tuple", () => {
    const baseFilters = { keyword: "chess" };
    const seoulScope = {
      range: "GU",
      region1: "서울특별시",
      region2: "마포구",
      region3: "서교동",
    };
    const nearbyScope = { ...seoulScope, region3: "합정동" };

    const viewerOne = queryKeys.products.list(
      { ...baseFilters, __scope: seoulScope },
      1
    );
    const viewerTwo = queryKeys.products.list(
      { ...baseFilters, __scope: seoulScope },
      2
    );
    const otherRegion = queryKeys.products.list(
      { ...baseFilters, __scope: nearbyScope },
      1
    );

    expect(viewerOne).not.toEqual(viewerTwo);
    expect(viewerOne).not.toEqual(otherRegion);
    expect(viewerOne.slice(0, 2)).toEqual(queryKeys.products.lists());
  });

  it("separates block-filtered content by viewer", () => {
    expect(queryKeys.posts.list({ category: "" }, 1)).not.toEqual(
      queryKeys.posts.list({ category: "" }, 2)
    );
    expect(queryKeys.posts.comments(10, 1)).not.toEqual(
      queryKeys.posts.comments(10, 2)
    );
    expect(queryKeys.streams.vodComments(20, 1)).not.toEqual(
      queryKeys.streams.vodComments(20, 2)
    );
    expect(queryKeys.reviews.user(30, 1)).not.toEqual(
      queryKeys.reviews.user(30, 2)
    );
    expect(queryKeys.streams.list("all", { keyword: "" }, 1)).not.toEqual(
      queryKeys.streams.list("all", { keyword: "" }, 2)
    );
    expect(
      queryKeys.streams.recordingList("latest", { keyword: "" }, 1)
    ).not.toEqual(
      queryKeys.streams.recordingList("latest", { keyword: "" }, 2)
    );
  });

  it("separates relationship and channel results by viewer", () => {
    expect(queryKeys.users.followStats(10, 1)).not.toEqual(
      queryKeys.users.followStats(10, 2)
    );
    expect(queryKeys.follows.list("owner", "followers", 1)).not.toEqual(
      queryKeys.follows.list("owner", "followers", 2)
    );
    expect(queryKeys.streams.channelRecordings(10, 1)).not.toEqual(
      queryKeys.streams.channelRecordings(10, 2)
    );
  });

  it("keeps private search history under its owner key", () => {
    expect(queryKeys.search.history(1)).not.toEqual(
      queryKeys.search.history(2)
    );
  });

  it("keeps broad invalidation prefixes stable", () => {
    const liveListKey = queryKeys.streams.list(
      "following",
      { category: "", keyword: "" },
      1
    );

    expect(liveListKey.slice(0, 2)).toEqual(queryKeys.streams.lists());
    expect(
      queryKeys.follows.list("owner", "following", 1).slice(0, 1)
    ).toEqual(queryKeys.follows.all);
  });
});
