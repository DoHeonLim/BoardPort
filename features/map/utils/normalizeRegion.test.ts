/**
 * File Name : features/map/utils/normalizeRegion.test.ts
 * Description : 카카오 행정구역 정규화 유틸 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.06.18  임도헌   Created   도 단위/광역시 주소 정규화와 표시 문자열 테스트 추가
 */

import { describe, expect, test } from "vitest";

import {
  formatNormalizedRegion,
  normalizeKakaoRegion,
} from "./normalizeRegion";

describe("normalizeKakaoRegion", () => {
  test("도 단위 주소는 시/군을 1차 지역으로 올린다", () => {
    expect(
      normalizeKakaoRegion({
        region1: "경기",
        region2: "수원시 영통구",
        region3: "매탄동",
      })
    ).toEqual({
      region1: "수원시",
      region2: "영통구",
      region3: "매탄동",
    });
  });

  test("구가 없는 시/동 구조는 동 단위 필터가 가능하게 저장한다", () => {
    expect(
      normalizeKakaoRegion({
        region1: "경남",
        region2: "거제시",
        region3: "고현동",
      })
    ).toEqual({
      region1: "거제시",
      region2: "거제시",
      region3: "고현동",
    });
  });

  test("특별시/광역시 주소는 카카오 1depth 값을 그대로 유지한다", () => {
    expect(
      normalizeKakaoRegion({
        region1: "서울",
        region2: "마포구",
        region3: "합정동",
      })
    ).toEqual({
      region1: "서울",
      region2: "마포구",
      region3: "합정동",
    });

    expect(
      normalizeKakaoRegion({
        region1: "대전",
        region2: "유성구",
        region3: "봉명동",
      })
    ).toEqual({
      region1: "대전",
      region2: "유성구",
      region3: "봉명동",
    });
  });

  test("표시 문자열은 중복 지역 단위를 숨긴다", () => {
    expect(
      formatNormalizedRegion({
        region1: "거제시",
        region2: "거제시",
        region3: "고현동",
      })
    ).toBe("거제시 고현동");
  });
});
