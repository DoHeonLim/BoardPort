/**
 * File Name : features/report/utils/analytics.test.ts
 * Description : 관리자 차트 집계 유틸 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   관리자 대시보드 trend와 시간 bucket 집계 테스트 추가
 */

import { describe, expect, it } from "vitest";

import {
  buildRecentDayBuckets,
  buildRecentGroupedDayBuckets,
  buildRecentHourBuckets,
  calculateTrend,
  countItemsByKey,
} from "./analytics";

describe("admin analytics utils", () => {
  it("전월 대비 증감률을 계산한다", () => {
    expect(calculateTrend(120, 100)).toBe("+20.0% (지난달 대비)");
    expect(calculateTrend(80, 100)).toBe("-20.0% (지난달 대비)");
    expect(calculateTrend(10, 0)).toBeUndefined();
  });

  it("최근 N일 데이터를 오늘 포함 일 단위 bucket으로 정규화한다", () => {
    const now = new Date("2026-05-25T15:30:00");

    expect(
      buildRecentDayBuckets(
        [
          new Date("2026-05-23T09:00:00"),
          new Date("2026-05-25T10:00:00"),
          new Date("2026-05-25T12:00:00"),
          new Date("2026-05-20T12:00:00"),
        ],
        3,
        now
      )
    ).toEqual({
      labels: ["5.23", "5.24", "5.25"],
      values: [1, 0, 2],
    });
  });

  it("최근 N시간 데이터를 현재 시간 포함 시간 bucket으로 정규화한다", () => {
    const now = new Date("2026-05-25T15:30:00");

    expect(
      buildRecentHourBuckets(
        [
          new Date("2026-05-25T13:05:00"),
          new Date("2026-05-25T15:10:00"),
          new Date("2026-05-25T15:45:00"),
          new Date("2026-05-25T11:59:00"),
        ],
        3,
        now
      )
    ).toEqual({
      labels: ["13시", "14시", "15시"],
      values: [1, 0, 2],
    });
  });

  it("최근 N일 데이터를 key별 그룹 bucket으로 집계한다", () => {
    const now = new Date("2026-05-25T15:30:00");

    expect(
      buildRecentGroupedDayBuckets(
        [
          { created_at: new Date("2026-05-24T09:00:00"), key: "PENDING" },
          { created_at: new Date("2026-05-25T09:00:00"), key: "PENDING" },
          { created_at: new Date("2026-05-25T10:00:00"), key: "RESOLVED" },
          { created_at: new Date("2026-05-20T10:00:00"), key: "PENDING" },
        ],
        2,
        ["PENDING", "RESOLVED"] as const,
        now
      )
    ).toEqual({
      labels: ["5.24", "5.25"],
      grouped: {
        PENDING: [1, 1],
        RESOLVED: [0, 1],
      },
    });
  });

  it("key 목록을 기준으로 누락된 항목까지 0으로 집계한다", () => {
    expect(
      countItemsByKey(["SPAM", "SCAM", "SPAM"], ["SPAM", "SCAM", "OTHER"])
    ).toEqual({
      SPAM: 2,
      SCAM: 1,
      OTHER: 0,
    });
  });
});
