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
 */

import { AdminAuditLogItem, AdminReportItem } from "@/features/report/types";

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
