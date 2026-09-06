/**
 * File Name : lib/accessibility.ts
 * Description : 사용자 접근성 환경 설정을 반영하는 공용 브라우저 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.08.27  임도헌   Created   모션 축소 설정에 따른 스크롤 동작 결정 유틸 추가
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** 브라우저의 모션 축소 설정 활성화 여부를 반환한다. */
export function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

/** 모션 축소 사용자는 즉시, 나머지 사용자는 부드럽게 스크롤하도록 결정한다. */
export function getMotionSafeScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? "auto" : "smooth";
}
