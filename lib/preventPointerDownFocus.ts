/**
 * File Name : lib/preventPointerDownFocus.ts
 * Description : 포인터 클릭 시 현재 input blur 검증이 먼저 실행되지 않도록 돕는 공통 핸들러
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.05.12  임도헌   Created   인증 폼 보조 이동 CTA의 blur 검증 지연 방지 핸들러 추가
 */

import type { PointerEvent } from "react";

/**
 * 포인터 조작에서 focus 이동을 막아 onBlur 검증이 CTA 클릭보다 먼저 UI를 흔들지 않도록 처리
 *
 * @param event - 포인터 down 이벤트
 */
export function preventPointerDownFocus(event: PointerEvent<HTMLElement>) {
  event.preventDefault();
}
