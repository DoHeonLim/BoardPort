/**
 * File Name : features/report/utils/adminFormatter.test.ts
 * Description : 관리자 신고/감사 로그 포맷터 회귀 테스트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.25  임도헌   Created   신고 대상 라벨, 추적 URL, 감사 로그 사유 포맷 테스트 추가
 */

import { describe, expect, it } from "vitest";

import type {
  AdminAuditLogItem,
  AdminReportItem,
} from "@/features/report/types";
import {
  formatAuditReason,
  getAuditLogTargetUrl,
  getDirectTargetUrl,
  getParentContextUrl,
  getReportTargetId,
  getReportTargetLabel,
  getReportTargetParentLabel,
  getReportTargetType,
  getTargetUrl,
} from "./adminFormatter";

function createReport(overrides: Partial<AdminReportItem>): AdminReportItem {
  return {
    id: 1,
    reporterId: 10,
    targetUserId: null,
    targetProductId: null,
    targetPostId: null,
    targetCommentId: null,
    targetStreamId: null,
    targetProductMessageId: null,
    targetStreamMessageId: null,
    targetReviewId: null,
    reason: "OTHER",
    description: null,
    status: "PENDING",
    adminComment: null,
    created_at: new Date("2026-05-25T00:00:00"),
    updated_at: new Date("2026-05-25T00:00:00"),
    reporter: {
      id: 10,
      username: "reporter",
    },
    ...overrides,
  } as AdminReportItem;
}

function createAuditLog(
  overrides: Partial<AdminAuditLogItem>
): AdminAuditLogItem {
  return {
    id: 1,
    admin: {
      id: 99,
      username: "admin",
    },
    action: "RESOLVE_REPORT",
    targetType: "REPORT",
    targetId: 123,
    reason: null,
    created_at: new Date("2026-05-25T00:00:00"),
    ...overrides,
  };
}

describe("admin report formatter", () => {
  it("ADD_STRIKE 사유에서 moderation metadata를 운영자용 보조 문구로 분리한다", () => {
    expect(
      formatAuditReason(
        "ADD_STRIKE",
        "욕설 반복 [moderation-meta]action=TEMP_BAN;strike=2;duration=7"
      )
    ).toEqual({
      displayReason: "욕설 반복",
      metaInfo: "조치: 일시 정지 / strike 2회 / 기간 7일",
    });
  });

  it("WARN_USER 사유의 action key를 한글 조치명으로 변환한다", () => {
    expect(
      formatAuditReason(
        "WARN_USER",
        "신고 승인 (action: DELETE_CONTENT, strike: 1, total: 3)"
      )
    ).toEqual({
      displayReason: "신고 승인",
      metaInfo: "조치: 콘텐츠 삭제 / strike 1회 / 누적 3회",
    });
  });

  it("삭제 감사 로그의 OwnerID 조각에 유저명을 보조 표시한다", () => {
    expect(
      formatAuditReason(
        "DELETE_POST",
        "PostID: 7 / OwnerID: 42 / Title: 테스트 / Reason: 운영자 삭제",
        { reasonOwnerUsername: "seller" }
      )
    ).toEqual({
      displayReason: "운영자 삭제",
      metaInfo: "PostID: 7 | OwnerID: 42 (seller) | Title: 테스트",
    });
  });

  it("신고 대상 타입, 라벨, ID, 부모 라벨을 계산한다", () => {
    const commentReport = createReport({
      targetCommentId: 33,
      targetParentPostId: 77,
    });

    expect(getReportTargetType(commentReport)).toBe("COMMENT");
    expect(getReportTargetLabel(commentReport)).toBe("댓글");
    expect(getReportTargetId(commentReport)).toBe(33);
    expect(getReportTargetParentLabel(commentReport)).toBe("원본 게시글");
  });

  it("댓글/리뷰/메시지 신고는 부모 문맥 URL을 우선 제공한다", () => {
    const commentReport = createReport({
      targetCommentId: 33,
      targetParentPostId: 77,
    });

    expect(getTargetUrl(commentReport, "/admin/reports?page=2")).toBe(
      "/posts/77?returnTo=%2Fadmin%2Freports%3Fpage%3D2"
    );
    expect(getDirectTargetUrl(commentReport)).toBeNull();
    expect(getParentContextUrl(commentReport)).toBe("/posts/77");
  });

  it("직접 상세가 있는 신고와 감사 로그는 추적 URL을 생성한다", () => {
    expect(
      getTargetUrl(
        createReport({ targetProductId: 55 }),
        "/admin/reports?status=PENDING"
      )
    ).toBe("/products/view/55?returnTo=%2Fadmin%2Freports%3Fstatus%3DPENDING");

    expect(getAuditLogTargetUrl(createAuditLog({ targetType: "USER", targetId: 9 }))).toBe(
      "/admin/users?query=9"
    );
    expect(
      getAuditLogTargetUrl(createAuditLog({ targetType: "REPORT", targetId: 3 }))
    ).toBe("/admin/reports?status=ALL&q=3&open=3");
  });
});
