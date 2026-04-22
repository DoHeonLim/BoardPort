/**
 * File Name : components/ui/FormErrorSummary.tsx
 * Description : 폼 상단에 중복 제거된 검증 에러 요약을 출력하는 UI 컴포넌트
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.08  임도헌   Created   접근성 속성을 포함한 폼 에러 요약 배너 컴포넌트 추가
 * 2026.03.12  임도헌   Modified  중첩 에러를 재귀 수집해 상위 3개만 노출하는 요약 규칙 명확화
 * 2026.03.25  임도헌   Modified  인증 화면에서 필드 에러와 함께 보일 때 부담이 덜하도록 배너 밀도와 톤을 완화
 * 2026.04.10  임도헌   Modified  Pretendard subset 3-weight 정책에 맞춰 배너 제목/본문 크기와 weight를 정리
 */

"use client";

import type { FieldErrors, FieldValues } from "react-hook-form";

type FormErrorSummaryProps<TFieldValues extends FieldValues> = {
  errors: FieldErrors<TFieldValues>;
  title?: string;
};

/**
 * 중첩 에러 메시지 평탄화
 * - react-hook-form 에러 객체 재귀 순회
 */
function collectMessages(
  errors: FieldErrors<FieldValues>,
  bucket: string[] = []
): string[] {
  for (const value of Object.values(errors)) {
    if (!value || typeof value !== "object") continue;

    if ("message" in value && typeof value.message === "string") {
      bucket.push(value.message);
      continue;
    }

    collectMessages(value as FieldErrors<FieldValues>, bucket);
  }

  return bucket;
}

/**
 * 폼 에러 요약 배너
 * - 중복 제거된 상위 3개 메시지 노출
 */
export default function FormErrorSummary<TFieldValues extends FieldValues>({
  errors,
  title = "입력 내용을 확인해주세요.",
}: FormErrorSummaryProps<TFieldValues>) {
  const messages = Array.from(new Set(collectMessages(errors))).slice(0, 3);

  if (messages.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="rounded-xl border border-danger/20 bg-danger/[0.06] px-4 py-2.5 text-danger dark:bg-danger/[0.08]"
    >
      <p className="text-base font-medium">{title}</p>
      <ul className="mt-1 space-y-0.5 text-sm">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
