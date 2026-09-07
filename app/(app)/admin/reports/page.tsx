/**
 * File Name : app/(app)/admin/reports/page.tsx
 * Description : 관리자 신고 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   신고 목록 서버 사이드 페칭 및 레이아웃 구성
 * 2026.03.23  임도헌   Modified  page 쿼리를 1 이상의 정수로 정규화해 음수 skip 예외를 방지
 * 2026.03.29  임도헌   Modified  최근 14일 신고 추이, 사유 분포, 운영 병목 요약을 포함한 인사이트 헤더와 범위 안내를 추가
 * 2026.04.12  임도헌   Moved     파일 경로를 app/admin/reports/page.tsx 에서 app/(app)/admin/reports/page.tsx 로 변경 (라우트 그룹 개편)
 * 2026.08.23  임도헌   Modified  Next.js 16 비동기 요청 API와 route config 호환 반영
 */
import {
  getReportInsightsAction,
  getReportsAdminAction,
} from "@/features/report/actions/admin";
import AdminErrorState from "@/features/report/components/admin/AdminErrorState";
import AdminScopeNotice from "@/features/report/components/admin/AdminScopeNotice";
import AdminReportListContainer from "@/features/report/components/admin/AdminReportListContainer";
import ReportInsightHeader from "@/features/report/components/admin/ReportInsightHeader";

/**
 * 신고 관리 페이지
 * - 최근 14일 전체 신고 인사이트와 현재 상태 탭 기준의 처리 목록을 함께 제공
 * - 상단에서 큐 상태를 파악하고, 아래 리스트/모달에서 실제 승인·기각 조치를 이어서 수행
 */
export default async function AdminReportsPage(props: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const status = searchParams.status || "PENDING";
  const query = searchParams.q || "";
  const rawPage = Number(searchParams.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const [result, insights] = await Promise.all([
    getReportsAdminAction({ status, query, page }),
    getReportInsightsAction(),
  ]);

  if (!result.success || !result.data || !insights.success || !insights.data) {
    return (
      <AdminErrorState
        title="신고 관리"
        description="접수된 신고를 검토하고 조치 내용을 기록하세요."
        message="신고 데이터를 불러오지 못했습니다."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">신고 관리</h2>
        <p className="mt-1 text-sm text-muted">
          접수된 신고를 검토하고 조치 내용을 기록하세요.
        </p>
      </div>
      <AdminScopeNotice description="상단 인사이트는 최근 14일 전체 신고 기준이며, 아래 목록은 현재 상태 탭 기준으로 조치할 대상을 보여줍니다." />

      <ReportInsightHeader
        labels={insights.data.labels}
        statusSeries={insights.data.statusSeries}
        reasonItems={insights.data.reasonItems}
        summary={insights.data.summary}
      />

      <AdminReportListContainer data={result.data} currentStatus={status} />
    </div>
  );
}
