/**
 * File Name : features/notification/components/NotificationSettingsSubmitButton.tsx
 * Description : 알림 설정 서버 폼의 제출 상태 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.18  임도헌   Created   서버 액션 기반 알림 설정 폼용 제출 상태 버튼 분리
 */

"use client";

import { useFormStatus } from "react-dom";

export function NotificationSettingsSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn-primary h-12 w-full rounded-xl disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "저장 중..." : "설정 저장하기"}
    </button>
  );
}
