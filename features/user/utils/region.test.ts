/**
 * File Name : features/user/utils/region.test.ts
 * Description : 사용자 지역 범위 필터 유틸 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.04  임도헌   Created   지역 범위 비교/where 빌더 회귀 테스트 추가
 * 2026.06.18  임도헌   Modified  도 단위 정규화 정책에 맞춰 테스트 지역명을 1차 지역 기준으로 정리
 */

import { describe, expect, test } from "vitest";

import type { RegionRange } from "@/generated/prisma/client";
import { buildRegionWhere, isWithinRegionRange } from "./region";

describe("region range utils", () => {
  const range = (value: RegionRange) => value;

  test("구 단위 필터는 같은 구 이름이어도 1차 지역이 다르면 제외한다", () => {
    const user = {
      region1: "울산",
      region2: "동구",
      region3: "화정동",
      regionRange: range("GU"),
    };

    expect(
      isWithinRegionRange(user, {
        region1: "광주",
        region2: "동구",
        region3: "충장동",
      })
    ).toBe(false);
    expect(
      isWithinRegionRange(user, {
        region1: "울산",
        region2: "동구",
        region3: "방어동",
      })
    ).toBe(true);
    expect(buildRegionWhere(user)).toEqual({
      region1: "울산",
      region2: "동구",
    });
  });

  test("동 단위 필터도 1차 지역과 구를 함께 적용한다", () => {
    const user = {
      region1: "서울",
      region2: "중구",
      region3: "신당동",
      regionRange: range("DONG"),
    };

    expect(
      isWithinRegionRange(user, {
        region1: "부산",
        region2: "중구",
        region3: "신당동",
      })
    ).toBe(false);
    expect(
      isWithinRegionRange(user, {
        region1: "서울",
        region2: "다른구",
        region3: "신당동",
      })
    ).toBe(false);
    expect(buildRegionWhere(user)).toEqual({
      region1: "서울",
      region2: "중구",
      region3: "신당동",
    });
  });
});
