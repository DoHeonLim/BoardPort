import { describe, expect, test } from "vitest";

import type { RegionRange } from "@/generated/prisma/client";
import { buildRegionWhere, isWithinRegionRange } from "./region";

describe("region range utils", () => {
  const range = (value: RegionRange) => value;

  test("구 단위 필터는 같은 구 이름이어도 시/도가 다르면 제외한다", () => {
    const user = {
      region1: "울산광역시",
      region2: "동구",
      region3: "화정동",
      regionRange: range("GU"),
    };

    expect(
      isWithinRegionRange(user, {
        region1: "광주광역시",
        region2: "동구",
        region3: "충장동",
      })
    ).toBe(false);
    expect(
      isWithinRegionRange(user, {
        region1: "울산광역시",
        region2: "동구",
        region3: "방어동",
      })
    ).toBe(true);
    expect(buildRegionWhere(user)).toEqual({
      region1: "울산광역시",
      region2: "동구",
    });
  });

  test("동 단위 필터도 시/도와 구를 함께 적용한다", () => {
    const user = {
      region1: "서울특별시",
      region2: "중구",
      region3: "신당동",
      regionRange: range("DONG"),
    };

    expect(
      isWithinRegionRange(user, {
        region1: "부산광역시",
        region2: "중구",
        region3: "신당동",
      })
    ).toBe(false);
    expect(
      isWithinRegionRange(user, {
        region1: "서울특별시",
        region2: "다른구",
        region3: "신당동",
      })
    ).toBe(false);
    expect(buildRegionWhere(user)).toEqual({
      region1: "서울특별시",
      region2: "중구",
      region3: "신당동",
    });
  });
});
