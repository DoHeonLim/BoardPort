/**
 * File Name : lib/applyFieldErrors.ts
 * Description : 서버 fieldErrors를 react-hook-form 에러와 포커스/스크롤 동작으로 매핑하는 유틸
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.08  임도헌   Created   서버 fieldErrors 공통 적용 및 첫 에러 포커스/스크롤 처리 유틸 추가
 * 2026.03.12  임도헌   Modified  첫 필드 포커스/스크롤 옵션과 공통 fieldErrors 매핑 규칙 명확화
 * 2026.03.12  임도헌   Modified  로그인/회원가입/상품/게시글/스트림 폼 공통 서버 에러 적용 경로로 통일
 */

import type {
  FieldPath,
  FieldValues,
  UseFormSetError,
  UseFormSetFocus,
} from "react-hook-form";

/**
 * 서버 필드 에러가 매핑된 실제 입력 요소를 찾아 화면 중앙으로 스크롤
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
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}

/**
 * 서버에서 내려온 fieldErrors를 react-hook-form 에러 객체에 반영
 * - 첫 번째 에러 필드는 선택적으로 포커스/스크롤 이동까지 처리
 * - 동일한 매핑 규칙을 로그인/회원가입/상품/게시글/스트림 폼에서 공통으로 재사용
 *
 * @param setError - react-hook-form setError 함수
 * @param fieldErrors - 서버 액션에서 내려온 필드별 에러 맵
 * @param options - 에러 타입, 첫 필드 포커스 옵션
 */
export function applyFieldErrors<TFieldValues extends FieldValues>(
  setError: UseFormSetError<TFieldValues>,
  fieldErrors?: Record<string, string[] | undefined>,
  options?: {
    type?: "server" | "manual";
    setFocus?: UseFormSetFocus<TFieldValues>;
    shouldFocusFirst?: boolean;
  }
) {
  if (!fieldErrors) return;

  let firstField: FieldPath<TFieldValues> | null = null;

  Object.entries(fieldErrors).forEach(([field, messages]) => {
    const message = messages?.[0];
    if (!message) return;

    const fieldPath = field as FieldPath<TFieldValues>;
    if (!firstField) {
      firstField = fieldPath;
    }

    setError(fieldPath, {
      type: options?.type ?? "server",
      message,
    });
  });

  if (firstField && options?.shouldFocusFirst !== false) {
    options?.setFocus?.(firstField);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        scrollFieldIntoView(String(firstField));
      });
    }
  }
}
