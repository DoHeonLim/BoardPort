/**
 * File Name : app/admin/reports/page.tsx
 * Description : 관리자 신고 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   신고 목록 서버 사이드 페칭 및 레이아웃 구성
 */
import { getReportsAdminAction } from "@/features/report/actions/admin";
import ReportListContainer from "@/features/report/components/admin/ReportListContainer";
import { redirect } from "next/navigation";

/**
 * 신고 관리 페이지
 * - 접수된 신고를 상태(대기/처리됨/기각)별로 필터링하여 조회
 * - `ReportListContainer`를 통해 신고 내용을 검토하고 승인(조치) 또는 기각 처리
 */
export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const status = searchParams.status || "PENDING";
  const page = Number(searchParams.page) || 1;

  const result = await getReportsAdminAction({ status, page });

  if (!result.success || !result.data) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          신고 관리
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          접수된 신고를 검토하고 조치 내용을 기록하세요.
        </p>
      </div>

      <ReportListContainer data={result.data} currentStatus={status} />
    </div>
  );
}
