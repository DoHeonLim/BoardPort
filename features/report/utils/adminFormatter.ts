/**
 * File Name : features/report/utils/adminFormatter.ts
 * Description : 관리자 화면용 데이터 포맷팅 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created
 */

import { AdminReportItem } from "@/features/report/types";

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

/**
 * 신고 대상 상세 페이지 URL 생성
 * - 관리자가 내용을 확인하러 이동할 때 사용할 링크 생성
 * - 단일 페이지가 있는 리소스(Product, Post 등)에 대해 링크 제공
 *
 * @param report - 리포트 객체
 * @returns {string | null} 상세 페이지 URL 또는 null
 */
export function getTargetUrl(report: AdminReportItem): string | null {
  if (report.targetProductId) return `/products/view/${report.targetProductId}`;
  if (report.targetPostId) return `/posts/${report.targetPostId}`;
  if (report.targetStreamId) return `/streams/${report.targetStreamId}`;

  // 유저는 username이 필요하므로, ID만으로는 이동이 어려울 수 있음 (추후 /admin/users/[id]로 연결 권장)
  // 리뷰/댓글/메시지는 단독 페이지가 없으므로 null (또는 부모 콘텐츠로 이동 로직 필요)

  return null;
}
