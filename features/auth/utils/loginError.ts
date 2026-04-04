/**
 * File Name : features/auth/utils/loginError.ts
 * Description : 로그인 페이지 표시용 소셜 로그인 에러 메시지 매핑 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.12  임도헌   Created   OAuth 콜백 에러 코드를 로그인 화면 메시지로 변환하는 공통 유틸 분리
 * 2026.04.02  임도헌   Modified  로그인 에러 매핑 JSDoc 보강
 */

/**
 * 로그인 화면 표시용 에러 메시지 매핑
 *
 * @param {string | undefined} error - OAuth 콜백 또는 로그인 흐름에서 전달된 에러 코드
 * @returns {string | undefined} 사용자에게 노출할 안내 문구
 */
export function getLoginErrorMessage(error?: string) {
  switch (error) {
    case "banned_user":
      return "운영 정책에 의해 이용이 정지된 계정입니다.";
    case "github_login_failed":
      return "GitHub 로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    case "kakao_login_failed":
      return "카카오 로그인 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    case "github_state_mismatch":
    case "kakao_state_mismatch":
      return "소셜 로그인 보안 검증에 실패했습니다. 다시 시도해주세요.";
    case "github_code_missing":
    case "kakao_code_missing":
      return "소셜 로그인 인증 정보가 올바르지 않습니다. 다시 시도해주세요.";
    default:
      return undefined;
  }
}
