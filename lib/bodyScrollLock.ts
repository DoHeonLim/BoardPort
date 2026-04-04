/**
 * File Name : lib/bodyScrollLock.ts
 * Description : body/html 스크롤 잠금 공용 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.10  임도헌   Created   모달/시트 중첩 상황에서도 안전하게 스크롤 잠금/복구를 관리하는 공용 유틸 추가
 * 2026.03.12  임도헌   Modified  중첩 모달 기준 lockCount와 이전 overflow 복원 규칙 명확화
 * 2026.03.12  임도헌   Modified  body/html 스크롤 잠금 SSOT 유틸 역할을 현재 사용처 기준으로 통일
 */

let lockCount = 0;
let previousBodyOverflow = "";
let previousHtmlOverflow = "";
let previousBodyOverscrollBehavior = "";
let previousHtmlOverscrollBehavior = "";

/**
 * body/html 스크롤 잠금 적용
 * - 최초 잠금 시 현재 overflow/overscroll 상태를 저장
 * - 중첩 모달은 lockCount만 증가시켜 마지막 해제 시점까지 잠금을 유지
 * - body와 html을 함께 잠가 모바일 브라우저의 bounce scroll과 주소창 변형에도 일관되게 대응
 */
export function lockBodyScroll() {
  if (typeof document === "undefined") return;

  if (lockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    previousHtmlOverflow = document.documentElement.style.overflow;
    previousBodyOverscrollBehavior = document.body.style.overscrollBehavior;
    previousHtmlOverscrollBehavior =
      document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.documentElement.style.overscrollBehavior = "none";
  }

  lockCount += 1;
}

/**
 * body/html 스크롤 잠금 해제
 * - 중첩 잠금이 남아 있으면 카운트만 감소시키고 실제 스타일은 유지
 * - 마지막 잠금이 해제될 때 저장해둔 이전 스타일을 복원
 * - lockCount가 0 미만으로 내려가지 않도록 초기에 방어해 중복 해제에도 안전하게 동작
 */
export function unlockBodyScroll() {
  if (typeof document === "undefined" || lockCount === 0) return;

  lockCount -= 1;

  if (lockCount > 0) return;

  document.body.style.overflow = previousBodyOverflow;
  document.documentElement.style.overflow = previousHtmlOverflow;
  document.body.style.overscrollBehavior = previousBodyOverscrollBehavior;
  document.documentElement.style.overscrollBehavior =
    previousHtmlOverscrollBehavior;
}
