/**
 * File Name : app/admin/logs/page.tsx
 * Description : 운영 감사 로그 조회 페이지
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   유저 목록 조회, 권한 변경, 정지(Ban) 로직 구현
 * 2026.02.08  임도헌   Modified  컴포넌트 분리 및 UI 개선 적용
 */

import AuditLogListContainer from "@/features/report/components/admin/AuditLogListContainer";
import { getAuditLogsAdmin } from "@/features/report/service/log";

export const dynamic = "force-dynamic";

/**
 * 감사 로그 페이지
 * - 관리자가 수행한 모든 주요 액션(정지, 삭제, 권한 변경 등)의 기록을 조회
 * - 누가(Admin), 언제, 무엇을, 왜(사유) 처리했는지 투명하게 관리
 */
export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const result = await getAuditLogsAdmin(page);

  if (!result.success || !result.data) {
    return <div>로그를 불러오는 데 실패했습니다.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          감사 로그
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          시스템에서 발생한 모든 관리자 활동 기록입니다.
        </p>
      </div>

      <AuditLogListContainer data={result.data} />
    </div>
  );
}
