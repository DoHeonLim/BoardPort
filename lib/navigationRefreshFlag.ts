/**
 * File Name : lib/navigationRefreshFlag.ts
 * Description : 뒤로가기 복귀 직후 1회 새로고침 신호 관리 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.14  임도헌   Created   router.back() 복귀 직후 1회 refresh가 필요한 상세 화면에 공통으로 사용할 세션 플래그 유틸 추가
 * 2026.03.14  임도헌   Modified  URL 파라미터 오염 없이 back UX를 유지하기 위해 세션 기반 단발성 refresh 신호 규칙과 TTL 설명 보강
 */

const NAVIGATION_REFRESH_TTL_MS = 10_000;

/**
 * 세션 기반 1회 refresh 신호 키 생성
 *
 * [구성 이유]
 * - 상세 -> 수정 -> 저장 후 `router.back()`으로 복귀하면 이전 상세 화면이 App Router 캐시에서 복원될 수 있음
 * - 이때 URL에 `refreshed=1` 같은 파라미터를 붙이면 히스토리가 늘어나고 주소도 지저분해짐
 * - 그래서 현재 브라우저 세션 안에서만 살아있는 단발성 신호를 `sessionStorage`에 기록해 사용
 *
 * @param {string} scope - 화면 유형 구분값 (예: post-detail-refresh)
 * @param {number | string} id - 대상 리소스 식별자
 */
export function createNavigationRefreshFlagKey(
  scope: string,
  id: number | string
) {
  return `${scope}:${id}`;
}

/**
 * 1회 refresh 신호 기록
 *
 * [동작 방식]
 * - boolean 대신 타임스탬프를 저장해 오래 남은 플래그를 무시할 수 있게 함
 * - 동일 세션에서만 소비되는 임시 신호이므로 새 탭이나 외부 진입에는 영향을 주지 않음
 *
 * @param {string} key - `createNavigationRefreshFlagKey`로 생성한 키
 */
export function setNavigationRefreshFlag(key: string) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(key, Date.now().toString());
}

/**
 * 유효한 1회 refresh 신호 소비
 *
 * [소비 규칙]
 * - TTL 안에 생성된 플래그만 유효한 신호로 판단
 * - 읽은 직후 제거해 중복 refresh를 막음
 * - 개발 환경 StrictMode 재실행에도 오래된 플래그가 반복 소비되지 않도록 방어
 *
 * @param {string} key - `createNavigationRefreshFlagKey`로 생성한 키
 * @param {number} ttlMs - 유효 시간(ms), 기본 10초
 * @returns {boolean} 즉시 1회 refresh가 필요한지 여부
 */
export function consumeNavigationRefreshFlag(
  key: string,
  ttlMs: number = NAVIGATION_REFRESH_TTL_MS
): boolean {
  if (typeof window === "undefined") return false;

  const stored = sessionStorage.getItem(key);
  if (!stored) return false;

  sessionStorage.removeItem(key);

  const createdAt = Number(stored);
  if (!Number.isFinite(createdAt)) return false;

  return Date.now() - createdAt <= ttlMs;
}
