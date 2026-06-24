/**
 * File Name : features/report/utils/adminFormatter.ts
 * Description : 관리자 화면용 데이터 포맷팅 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   관리자 신고/감사 로그 대상의 라벨·ID·추적 링크 포맷팅 유틸 추가
 * 2026.03.18  임도헌   Modified  신고 목록 대상 상세 링크 생성 시 현재 관리자 경로를 returnTo로 함께 전달
 * 2026.03.30  임도헌   Modified  USER 대상 신고와 REPORT 감사 로그를 admin 화면으로 바로 추적하고, 댓글·리뷰·메시지의 직접 대상/부모 문맥 링크를 함께 제공하도록 확장
 * 2026.04.28  임도헌   Modified  신고 제재 감사 로그 사유를 운영자용 한글 요약으로 변환하는 포맷터 추가
 * 2026.04.28  임도헌   Modified  삭제 감사 로그의 OwnerID 메타에 유저명을 덧붙이는 표시 포맷 보강
 */

import { REPORT_RESOLUTION_ACTION_LABELS } from "@/features/report/constants";
import type {
  AdminAuditLogItem,
  AdminReportItem,
  ReportResolutionAction,
} from "@/features/report/types";

/**
 * 감사 로그 사유를 관리자 화면 표시용 본문과 보조 메타로 분리
 * - 저장된 원본 reason은 strike 집계와 운영 추적에 재사용되므로 변경하지 않음
 * - 화면에서는 내부 action 키, moderation metadata, OwnerID 보조 정보를 운영자용 문구로 치환
 */
export function formatAuditReason(
  action: string,
  reason: string | null,
  options?: { reasonOwnerUsername?: string | null }
) {
  if (!reason) return { displayReason: "-", metaInfo: "" };

  if (action === "ADD_STRIKE") {
    const [baseReason, meta] = reason.split("[moderation-meta]");
    const metaInfo = formatModerationMeta(meta);

    return {
      displayReason: baseReason.trim() || "-",
      metaInfo,
    };
  }

  if (action === "WARN_USER") {
    const match = reason.match(
      /^(.*)\s+\(action:\s*([^,]+),\s*strike:\s*(\d+),\s*total:\s*(\d+)\)$/
    );

    if (!match) return { displayReason: reason, metaInfo: "" };

    const [, baseReason, rawAction, strike, total] = match;
    const actionLabel =
      REPORT_RESOLUTION_ACTION_LABELS[rawAction as ReportResolutionAction] ??
      rawAction;

    return {
      displayReason: baseReason.trim() || "-",
      metaInfo: `조치: ${actionLabel} / strike ${strike}회 / 누적 ${total}회`,
    };
  }

  if (action === "RESOLVE_REPORT") {
    const [baseReason, actionSummary] = reason.split("\n[조치]");
    return {
      displayReason: baseReason.trim() || "-",
      metaInfo: actionSummary
        ? formatReportResolutionSummary(actionSummary)
        : "",
    };
  }

  if (reason.includes("Title:")) {
    const parts = reason.split(" / ");
    return {
      displayReason: parts[parts.length - 1].replace("Reason: ", ""),
      metaInfo: parts
        .slice(0, parts.length - 1)
        .map((part) =>
          formatOwnerIdPart(part, options?.reasonOwnerUsername)
        )
        .join(" | "),
    };
  }

  return { displayReason: reason, metaInfo: "" };
}

/**
 * 삭제 로그의 OwnerID 조각에 유저명을 덧붙여 운영자가 ID와 닉네임을 함께 확인하도록 변환
 */
function formatOwnerIdPart(part: string, ownerUsername?: string | null) {
  if (!ownerUsername || !/\bOwnerID:\s*\d+/.test(part)) return part;
  return `${part} (${ownerUsername})`;
}

/**
 * ADD_STRIKE 로그의 moderation metadata를 한글 보조 문구로 변환
 * - metadata는 `buildStrikeAuditReason`에서 만든 내부 파싱 포맷
 */
function formatModerationMeta(meta?: string) {
  if (!meta?.trim()) return "";

  const action = meta.match(/action=([^;]+)/)?.[1];
  const strike = meta.match(/strike=(\d+)/)?.[1];
  const duration = meta.match(/duration=(\d+)/)?.[1];
  const actionLabel = action
    ? (REPORT_RESOLUTION_ACTION_LABELS[action as ReportResolutionAction] ??
      action)
    : null;
  const durationText =
    duration && Number(duration) > 0
      ? ` / 기간 ${duration}일`
      : duration === "0"
        ? " / 기간 없음"
        : "";

  return [
    actionLabel ? `조치: ${actionLabel}` : null,
    strike ? `strike ${strike}회` : null,
  ]
    .filter(Boolean)
    .join(" / ")
    .concat(durationText);
}

/**
 * 신고 승인 로그의 `[조치]` 요약에서 내부 action 키만 화면 라벨로 변환
 */
function formatReportResolutionSummary(summary: string) {
  const trimmedSummary = summary.trim();
  if (!trimmedSummary) return "";

  const [rawAction, ...rest] = trimmedSummary.split(" / ");
  const action = rawAction.trim();
  const actionLabel =
    REPORT_RESOLUTION_ACTION_LABELS[action as ReportResolutionAction] ?? action;

  return [`조치: ${actionLabel}`, ...rest].join(" / ");
}

/**
 * 신고 대상의 타입 문자열 추출
 * - 리포트 객체의 필드(targetUserId 등) 존재 여부로 타입을 판별
 *
 * @param report - 리포트 객체
 * @returns {string} 대상 타입 문자열 (USER, PRODUCT 등)
 */
export function getReportTargetType(report: AdminReportItem) {
  if (report.targetUserId) return "USER";
  if (report.targetProductId) return "PRODUCT";
  if (report.targetPostId) return "POST";
  if (report.targetCommentId) return "COMMENT";
  if (report.targetStreamId) return "STREAM";
  if (report.targetReviewId) return "REVIEW";
  if (report.targetProductMessageId || report.targetStreamMessageId)
    return "MESSAGE";
  return "UNKNOWN";
}

export function getReportTargetLabel(report: AdminReportItem) {
  if (report.targetUserId) return "유저";
  if (report.targetProductId) return "상품";
  if (report.targetPostId) return "게시글";
  if (report.targetCommentId) return "댓글";
  if (report.targetStreamId) return "방송";
  if (report.targetReviewId) return "리뷰";
  if (report.targetProductMessageId) return "거래 메시지";
  if (report.targetStreamMessageId) return "방송 메시지";
  return "대상";
}

/**
 * 신고 대상의 ID 추출
 *
 * @param report - 리포트 객체
 * @returns {number} 대상 ID
 */
export function getReportTargetId(report: AdminReportItem) {
  return (
    report.targetUserId ||
    report.targetProductId ||
    report.targetPostId ||
    report.targetCommentId ||
    report.targetStreamId ||
    report.targetReviewId ||
    report.targetProductMessageId ||
    report.targetStreamMessageId ||
    0
  );
}

export function getReportTargetParentId(report: AdminReportItem) {
  return (
    report.targetParentPostId ||
    report.targetParentProductId ||
    report.targetParentStreamId ||
    null
  );
}

export function getReportTargetParentLabel(report: AdminReportItem) {
  if (report.targetCommentId) return "원본 게시글";
  if (report.targetReviewId || report.targetProductMessageId) return "원본 상품";
  if (report.targetStreamMessageId) return "원본 방송";
  return null;
}

/**
 * 신고 대상에서 가장 유용한 추적 화면 URL 생성
 * - USER는 admin 유저 검색으로, 댓글/리뷰/메시지는 부모 문맥 화면으로 유도
 * - 직접 대상 단독 상세가 있는 리소스는 해당 화면으로 연결
 *
 * @param report - 리포트 객체
 * @param returnTo - 관리자 목록 복귀 경로
 * @returns {string | null} 상세 페이지 URL 또는 null
 */
export function getTargetUrl(
  report: AdminReportItem,
  returnTo?: string
): string | null {
  const encodedReturnTo = returnTo ? encodeURIComponent(returnTo) : null;

  if (report.targetUserId) {
    return `/admin/users?query=${report.targetUserId}`;
  }

  if (report.targetProductId) {
    return encodedReturnTo
      ? `/products/view/${report.targetProductId}?returnTo=${encodedReturnTo}`
      : `/products/view/${report.targetProductId}`;
  }

  if (report.targetPostId) {
    return encodedReturnTo
      ? `/posts/${report.targetPostId}?returnTo=${encodedReturnTo}`
      : `/posts/${report.targetPostId}`;
  }

  if (report.targetStreamId) {
    return encodedReturnTo
      ? `/streams/${report.targetStreamId}?returnTo=${encodedReturnTo}`
      : `/streams/${report.targetStreamId}`;
  }

  if (report.targetCommentId && report.targetParentPostId) {
    return encodedReturnTo
      ? `/posts/${report.targetParentPostId}?returnTo=${encodedReturnTo}`
      : `/posts/${report.targetParentPostId}`;
  }

  if (report.targetReviewId && report.targetParentProductId) {
    return encodedReturnTo
      ? `/products/view/${report.targetParentProductId}?returnTo=${encodedReturnTo}`
      : `/products/view/${report.targetParentProductId}`;
  }

  if (report.targetProductMessageId && report.targetParentProductId) {
    return encodedReturnTo
      ? `/products/view/${report.targetParentProductId}?returnTo=${encodedReturnTo}`
      : `/products/view/${report.targetParentProductId}`;
  }

  if (report.targetStreamMessageId && report.targetParentStreamId) {
    return encodedReturnTo
      ? `/streams/${report.targetParentStreamId}?returnTo=${encodedReturnTo}`
      : `/streams/${report.targetParentStreamId}`;
  }

  return null;
}

export function getDirectTargetUrl(
  report: AdminReportItem,
  returnTo?: string
): string | null {
  const encodedReturnTo = returnTo ? encodeURIComponent(returnTo) : null;

  if (report.targetUserId) {
    return `/admin/users?query=${report.targetUserId}`;
  }

  if (report.targetProductId) {
    return encodedReturnTo
      ? `/products/view/${report.targetProductId}?returnTo=${encodedReturnTo}`
      : `/products/view/${report.targetProductId}`;
  }

  if (report.targetPostId) {
    return encodedReturnTo
      ? `/posts/${report.targetPostId}?returnTo=${encodedReturnTo}`
      : `/posts/${report.targetPostId}`;
  }

  if (report.targetStreamId) {
    return encodedReturnTo
      ? `/streams/${report.targetStreamId}?returnTo=${encodedReturnTo}`
      : `/streams/${report.targetStreamId}`;
  }

  return null;
}

export function getParentContextUrl(
  report: AdminReportItem,
  returnTo?: string
): string | null {
  const encodedReturnTo = returnTo ? encodeURIComponent(returnTo) : null;

  if (report.targetCommentId && report.targetParentPostId) {
    return encodedReturnTo
      ? `/posts/${report.targetParentPostId}?returnTo=${encodedReturnTo}`
      : `/posts/${report.targetParentPostId}`;
  }

  if (
    (report.targetReviewId || report.targetProductMessageId) &&
    report.targetParentProductId
  ) {
    return encodedReturnTo
      ? `/products/view/${report.targetParentProductId}?returnTo=${encodedReturnTo}`
      : `/products/view/${report.targetParentProductId}`;
  }

  if (report.targetStreamMessageId && report.targetParentStreamId) {
    return encodedReturnTo
      ? `/streams/${report.targetParentStreamId}?returnTo=${encodedReturnTo}`
      : `/streams/${report.targetParentStreamId}`;
  }

  return null;
}

/**
 * 감사 로그 대상 상세/관리 URL 생성
 * - 로그의 targetType과 targetId를 바탕으로 추적 가능한 화면 링크를 제공
 * - 일반 상세가 있는 리소스는 상세 페이지로, 관리자 엔터티는 admin 검색/모달 화면으로 연결
 */
export function getAuditLogTargetUrl(
  log: AdminAuditLogItem,
  returnTo?: string
): string | null {
  const encodedReturnTo = returnTo ? encodeURIComponent(returnTo) : null;

  if (log.targetType === "PRODUCT") {
    return encodedReturnTo
      ? `/products/view/${log.targetId}?returnTo=${encodedReturnTo}`
      : `/products/view/${log.targetId}`;
  }

  if (log.targetType === "POST") {
    return encodedReturnTo
      ? `/posts/${log.targetId}?returnTo=${encodedReturnTo}`
      : `/posts/${log.targetId}`;
  }

  if (log.targetType === "STREAM") {
    return encodedReturnTo
      ? `/streams/${log.targetId}?returnTo=${encodedReturnTo}`
      : `/streams/${log.targetId}`;
  }

  if (log.targetType === "REPORT") {
    return `/admin/reports?status=ALL&q=${log.targetId}&open=${log.targetId}`;
  }

  if (log.targetType === "USER") {
    return `/admin/users?query=${log.targetId}`;
  }

  return null;
}
