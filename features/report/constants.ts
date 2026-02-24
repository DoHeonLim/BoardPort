/**
 * File Name : features/report/constants.ts
 * Description : 신고 관련 상수 및 에러 메시지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   초기 상수 정의
 * 2026.02.06  임도헌   Modified  ReportTargetType에 'REVIEW' 추가
 */

import { ReportReason } from "@/generated/prisma/client";

/** 신고 대상 상세 타입 */
export type ReportTargetType =
  | "USER"
  | "PRODUCT"
  | "POST"
  | "COMMENT"
  | "STREAM"
  | "PRODUCT_MESSAGE"
  | "STREAM_MESSAGE"
  | "REVIEW";

/** 신고 사유 UI 라벨 매핑 */
export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  SPAM: "스팸 / 부적절한 홍보",
  INAPPROPRIATE: "부적절한 콘텐츠 (음란물, 불법 등)",
  ABUSIVE: "욕설 / 비하 / 혐오 발언",
  SCAM: "사기 의심 / 거래 규정 위반",
  OTHER: "기타 (직접 입력)",
};

/** 신고 시스템 에러 메시지 */
export const REPORT_ERRORS = {
  NOT_LOGGED_IN: "로그인이 필요합니다.",
  DUPLICATE_REPORT: "이미 신고한 대상입니다.",
  SELF_REPORT: "자신을 신고할 수 없습니다.",
  RATE_LIMIT:
    "단시간에 너무 많은 신고를 하셨습니다. 잠시 후 다시 시도해주세요.",
  SERVER_ERROR: "신고 처리 중 오류가 발생했습니다.",
} as const;

/** 악용 방지 정책 */
export const REPORT_POLICY = {
  WINDOW_MINUTES: 10, // 체크 시간 범위
  MAX_REPORTS_PER_WINDOW: 5, // 해당 시간 내 최대 신고 횟수
} as const;

/** 감사 로그 액션 한글 매핑 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  BAN_USER: "유저 정지",
  UNBAN_USER: "정지 해제",
  CHANGE_ROLE: "권한 변경",
  DELETE_PRODUCT: "상품 삭제",
  DELETE_POST: "게시글 삭제",
  DELETE_STREAM: "방송 종료",
  RESOLVE_REPORT: "신고 승인",
  DISMISS_REPORT: "신고 기각",
};

/** 대상 타입 한글 매핑 */
export const TARGET_TYPE_LABELS: Record<string, string> = {
  USER: "유저",
  PRODUCT: "상품",
  POST: "게시글",
  STREAM: "방송",
  REPORT: "신고",
  REVIEW: "리뷰",
};
