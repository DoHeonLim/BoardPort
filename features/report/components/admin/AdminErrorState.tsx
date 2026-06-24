/**
 * File Name : features/report/components/admin/AdminErrorState.tsx
 * Description : 관리자 페이지 공통 실패 상태 카드
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.03.30  임도헌   Created   admin 화면 데이터 로드 실패를 셸 안에서 일관되게 안내하는 공통 에러 카드 추가
 */

interface AdminErrorStateProps {
  title: string;
  description: string;
  message: string;
  retryMessage?: string;
}

/**
 * 관리자 페이지 공통 실패 상태
 *
 * [기능]
 * 1. 관리자 셸 내부에서 로드 실패를 일관된 카드 문법으로 안내
 * 2. 현재 화면 제목/설명을 유지해 운영 문맥이 끊기지 않게 구성
 */
export default function AdminErrorState({
  title,
  description,
  message,
  retryMessage = "잠시 후 다시 시도해 주세요.",
}: AdminErrorStateProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-16 text-center shadow-sm">
        <p className="text-base font-bold text-primary">{message}</p>
        <p className="mt-2 text-sm text-muted">{retryMessage}</p>
      </div>
    </div>
  );
}
