/**
 * File Name : features/user/constants.ts
 * Description : 유저 도메인 상수
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.01.24  임도헌   Created   상수 정의
 * 2026.03.07  임도헌   Modified  범용 서버 에러 문구를 v1.2 기준으로 구체화
 */

// 유저 관련 에러 메시지
export const USER_ERRORS = {
  NOT_LOGGED_IN: "로그인이 필요합니다.",
  UNAUTHORIZED: "권한이 없습니다.",
  NOT_FOUND: "사용자를 찾을 수 없습니다.",
  USERNAME_TAKEN: "이미 사용 중인 닉네임입니다.",
  EMAIL_TAKEN: "이미 가입된 이메일입니다.",
  PHONE_TAKEN: "이미 사용 중인 전화번호입니다.",
  INVALID_INPUT: "입력값이 올바르지 않습니다.",
  PASSWORD_MISMATCH: "비밀번호가 일치하지 않습니다.",
  CURRENT_PASSWORD_WRONG: "현재 비밀번호가 일치하지 않습니다.",
  SERVER_ERROR: "요청 처리에 실패했습니다. 잠시 후 다시 시도해주세요.",
} as const;

// 뱃지 한글 이름 매핑
export const BADGE_KOREAN_NAMES: Record<string, string> = {
  FIRST_DEAL: "첫 거래 선원",
  POWER_SELLER: "노련한 상인",
  QUICK_RESPONSE: "신속한 교신병",
  FIRST_POST: "첫 항해일지",
  POPULAR_WRITER: "인기 항해사",
  ACTIVE_COMMENTER: "열정적인 통신사",
  GAME_COLLECTOR: "보물선 수집가",
  GENRE_MASTER: "장르의 항해사",
  RULE_SAGE: "규칙의 현자",
  VERIFIED_SAILOR: "인증된 선원",
  FAIR_TRADER: "정직한 상인",
  QUALITY_MASTER: "품질의 달인",
  EARLY_SAILOR: "첫 항해 선원",
  PORT_FESTIVAL: "항구 축제의 주인",
  BOARD_EXPLORER: "보드게임 탐험가",
};
