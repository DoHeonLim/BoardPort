/**
 * File Name : features/report/constants.ts
 * Description : 신고 관련 상수 및 에러 메시지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.05  임도헌   Created   초기 상수 정의
 * 2026.02.06  임도헌   Modified  ReportTargetType에 'REVIEW' 추가
 * 2026.03.09  임도헌   Modified  신고 승인 후 제재 정책 상수 및 액션 정의 추가
 * 2026.04.03  임도헌   Modified  신고 공용 타입을 report/types로 이동하고 상수 설명을 보강
 */

import { ReportReason } from "@/generated/prisma/client";
import type {
  ReportResolutionAction,
  ReportResolutionRecommendation,
} from "@/features/report/types";

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

/** 신고 승인 시 관리자가 선택할 조치 유형 */
export const REPORT_RESOLUTION_ACTIONS = {
  WARN: "WARN",
  DELETE_CONTENT: "DELETE_CONTENT",
  TEMP_BAN: "TEMP_BAN",
  PERMA_BAN: "PERMA_BAN",
} as const;

/** 누적 제재 가이드 (최근 90일 기준) */
export const REPORT_STRIKE_POLICY = {
  WINDOW_DAYS: 90,
  WARN_AT: 1,
  TEMP_BAN_3_DAYS_AT: 2,
  TEMP_BAN_7_DAYS_AT: 3,
  TEMP_BAN_30_DAYS_AT: 4,
} as const;

/** 기본 정지 기간 프리셋 */
export const REPORT_BAN_DURATIONS = {
  THREE_DAYS: 3,
  SEVEN_DAYS: 7,
  THIRTY_DAYS: 30,
  PERMANENT: 0,
} as const;

/** 신고 사유별 권장 1차 대응 */
export const REPORT_REASON_DEFAULT_ACTION: Record<
  ReportReason,
  {
    action: ReportResolutionAction;
    strike: number;
    durationDays?: number;
  }
> = {
  SPAM: {
    action: REPORT_RESOLUTION_ACTIONS.TEMP_BAN,
    strike: 1,
    durationDays: REPORT_BAN_DURATIONS.THREE_DAYS,
  },
  INAPPROPRIATE: {
    action: REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT,
    strike: 1,
  },
  ABUSIVE: {
    action: REPORT_RESOLUTION_ACTIONS.WARN,
    strike: 1,
  },
  SCAM: {
    action: REPORT_RESOLUTION_ACTIONS.TEMP_BAN,
    strike: 2,
    durationDays: REPORT_BAN_DURATIONS.SEVEN_DAYS,
  },
  OTHER: {
    action: REPORT_RESOLUTION_ACTIONS.WARN,
    strike: 1,
  },
};

/** 현재 strike 누적을 고려해 신고 사유별 권장 조치를 계산 */
export function getRecommendedResolution(
  reason: ReportReason,
  currentStrikeTotal: number
): ReportResolutionRecommendation {
  const base = REPORT_REASON_DEFAULT_ACTION[reason];
  const projectedStrikeTotal = currentStrikeTotal + base.strike;

  if (projectedStrikeTotal >= REPORT_STRIKE_POLICY.TEMP_BAN_30_DAYS_AT) {
    return {
      action: REPORT_RESOLUTION_ACTIONS.TEMP_BAN,
      strike: base.strike,
      durationDays: REPORT_BAN_DURATIONS.THIRTY_DAYS,
      deleteContent:
        base.action === REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT ||
        reason === "INAPPROPRIATE",
    };
  }

  if (projectedStrikeTotal >= REPORT_STRIKE_POLICY.TEMP_BAN_7_DAYS_AT) {
    return {
      action: REPORT_RESOLUTION_ACTIONS.TEMP_BAN,
      strike: base.strike,
      durationDays: REPORT_BAN_DURATIONS.SEVEN_DAYS,
      deleteContent:
        base.action === REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT ||
        reason === "INAPPROPRIATE",
    };
  }

  if (projectedStrikeTotal >= REPORT_STRIKE_POLICY.TEMP_BAN_3_DAYS_AT) {
    return {
      action: REPORT_RESOLUTION_ACTIONS.TEMP_BAN,
      strike: base.strike,
      durationDays: REPORT_BAN_DURATIONS.THREE_DAYS,
      deleteContent:
        base.action === REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT ||
        reason === "INAPPROPRIATE",
    };
  }

  return {
    action: base.action,
    strike: base.strike,
    durationDays: base.durationDays,
    deleteContent: base.action === REPORT_RESOLUTION_ACTIONS.DELETE_CONTENT,
  };
}

/** 관리자 UI용 조치 설명 */
export const REPORT_RESOLUTION_ACTION_LABELS: Record<
  ReportResolutionAction,
  string
> = {
  WARN: "경고",
  DELETE_CONTENT: "콘텐츠 삭제",
  TEMP_BAN: "일시 정지",
  PERMA_BAN: "영구 정지",
};

/** 관리자 모달에서 각 조치 타입 아래에 표시할 설명 문구 */
export const REPORT_RESOLUTION_ACTION_DESCRIPTIONS: Record<
  ReportResolutionAction,
  string
> = {
  WARN: "관리자 코멘트와 함께 경고 및 strike를 누적합니다.",
  DELETE_CONTENT: "문제 콘텐츠를 삭제하고 필요한 경우 strike를 누적합니다.",
  TEMP_BAN: "유저를 일정 기간 정지하고 필요한 콘텐츠 조치도 병행합니다.",
  PERMA_BAN: "유저를 영구 정지합니다. 중대한 위반에서만 사용합니다.",
};

/** 감사 로그 액션 한글 매핑 */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  ADD_STRIKE: "strike 부여",
  WARN_USER: "유저 경고",
  BAN_USER: "유저 정지",
  UNBAN_USER: "정지 해제",
  CHANGE_ROLE: "권한 변경",
  DELETE_PRODUCT: "상품 삭제",
  DELETE_POST: "게시글 삭제",
  DELETE_COMMENT: "댓글 삭제",
  DELETE_REVIEW: "리뷰 삭제",
  DELETE_MESSAGE: "메시지 삭제",
  DELETE_STREAM: "방송 종료",
  RESOLVE_REPORT: "신고 승인",
  DISMISS_REPORT: "신고 기각",
};

/** 대상 타입 한글 매핑 */
export const TARGET_TYPE_LABELS: Record<string, string> = {
  USER: "유저",
  PRODUCT: "상품",
  POST: "게시글",
  COMMENT: "댓글",
  MESSAGE: "메시지",
  STREAM: "방송",
  REPORT: "신고",
  REVIEW: "리뷰",
};
