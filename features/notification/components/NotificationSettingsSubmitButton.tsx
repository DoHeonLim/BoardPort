/**
 * File Name : features/notification/components/NotificationSettingsSubmitButton.tsx
 * Description : 알림 설정 서버 폼의 제출 상태 버튼
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.04.18  임도헌   Created   서버 액션 기반 알림 설정 폼용 제출 상태 버튼 분리
 * 2026.09.13  임도헌   Modified  공통 제출 버튼의 pending 상태와 로딩 표시 적용
 */

import Button from "@/components/ui/Button";

export function NotificationSettingsSubmitButton() {
  return (
    <Button
      type="submit"
      text="설정 저장하기"
      loadingText="저장 중..."
      className="h-12"
    />
  );
}
