/**
 * File Name : lib/focusFirstFieldError.ts
 * Description : 클라이언트 검증 실패 시 첫 번째 필드 에러로 포커스/스크롤 이동하는 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.08  임도헌   Created   첫 번째 필드 에러 탐색 및 포커스/스크롤 이동 유틸 추가
 * 2026.03.12  임도헌   Modified  재귀 에러 경로 탐색과 첫 필드 포커스/스크롤 이동 역할 명확화
 * 2026.08.27  임도헌   Modified  모션 축소 설정에 따라 클라이언트 필드 오류 스크롤 동작 조정
 */

import type {
  FieldErrors,
  FieldPath,
  FieldValues,
  UseFormSetFocus,
} from "react-hook-form";
import { getMotionSafeScrollBehavior } from "@/lib/accessibility";

/**
 * name 기준 입력 요소 스크롤 이동
 */
function scrollFieldIntoView(fieldName: string) {
  if (typeof document === "undefined") return;

  const escapedName =
    typeof CSS !== "undefined" && typeof CSS.escape === "function"
      ? CSS.escape(fieldName)
      : fieldName.replace(/"/g, '\\"');

  const target =
    document.querySelector<HTMLElement>(`[name="${escapedName}"]`) ??
    document.getElementsByName(fieldName)[0];

  if (!target) return;

  target.scrollIntoView({
    behavior: getMotionSafeScrollBehavior(),
    block: "center",
    inline: "nearest",
  });
}

/**
 * 중첩 에러 객체의 첫 번째 필드 경로 탐색
 */
function findFirstErrorPath(
  errors: FieldErrors<FieldValues>,
  prefix = ""
): string | null {
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;

    const path = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "object" && "message" in value && value.message) {
      return path;
    }

    if (typeof value === "object") {
      const nested = findFirstErrorPath(
        value as FieldErrors<FieldValues>,
        path
      );
      if (nested) return nested;
    }
  }

  return null;
}

/**
 * 첫 번째 필드 에러 포커스/스크롤 이동
 * - 점 표기 경로 기준 setFocus와 DOM 탐색 공통 사용
 */
export function focusFirstFieldError<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
  setFocus: UseFormSetFocus<TFieldValues>
) {
  const firstPath = findFirstErrorPath(errors as FieldErrors<FieldValues>);
  if (!firstPath) return;

  const fieldPath = firstPath as FieldPath<TFieldValues>;
  setFocus(fieldPath);

  if (typeof window !== "undefined") {
    window.requestAnimationFrame(() => {
      scrollFieldIntoView(firstPath);
    });
  }
}
