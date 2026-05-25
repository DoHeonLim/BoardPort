/**
 * File Name : features/report/constants.test.ts
 * Description : 신고 제재 추천 정책 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   신고 사유와 누적 strike 기반 조치 추천 테스트 추가
 */

import { describe, expect, it } from "vitest";

import {
  getRecommendedResolution,
  REPORT_RESOLUTION_ACTIONS,
} from "./constants";

describe("report moderation policy", () => {
  it("기본 욕설 신고는 경고와 strike 1회로 추천한다", () => {
    expect(getRecommendedResolution("ABUSIVE", 0)).toEqual({
      action: REPORT_RESOLUTION_ACTIONS.WARN,
      strike: 1,
      deleteContent: false,
    });
  });

  it("사기 의심 신고는 7일 정지와 strike 2회로 추천한다", () => {
    expect(getRecommendedResolution("SCAM", 0)).toEqual({
      action: REPORT_RESOLUTION_ACTIONS.TEMP_BAN,
      strike: 2,
      durationDays: 7,
      deleteContent: false,
    });
  });

  it("부적절한 콘텐츠는 삭제 권장 상태를 유지한다", () => {
    expect(getRecommendedResolution("INAPPROPRIATE", 0)).toEqual({
      action: REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT,
      strike: 1,
      deleteContent: true,
    });
  });

  it("누적 strike가 높아져도 영구 정지는 자동 추천하지 않는다", () => {
    expect(getRecommendedResolution("OTHER", 3)).toEqual({
      action: REPORT_RESOLUTION_ACTIONS.TEMP_BAN,
      strike: 1,
      durationDays: 30,
      deleteContent: false,
    });
  });
});
