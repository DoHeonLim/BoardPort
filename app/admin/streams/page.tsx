/**
 * File Name : app/admin/streams/page.tsx
 * Description : 관리자 방송 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   현재 라이브 목록 조회
 * 2026.03.23  임도헌   Modified  page 쿼리를 1 이상의 정수로 정규화해 음수 skip 예외를 방지
 * 2026.03.29  임도헌   Modified  최근 7일 방송 시작 추이, 라이브 카테고리 분포, 운영 KPI를 포함한 인사이트 헤더를 추가
 * 2026.03.30  임도헌   Modified  카테고리 검색과 목록 기준 안내를 보강해 인사이트에서 방송 목록 추적으로 이어지게 정리
 */
import {
  getStreamsAdminAction,
  getStreamsAdminInsightsAction,
} from "@/features/stream/actions/admin";
import AdminErrorState from "@/features/report/components/admin/AdminErrorState";
import AdminScopeNotice from "@/features/report/components/admin/AdminScopeNotice";
import AdminStreamListContainer from "@/features/report/components/admin/AdminStreamListContainer";
import StreamInsightHeader from "@/features/report/components/admin/StreamInsightHeader";

export const dynamic = "force-dynamic";

/**
 * 방송 관리 페이지
 * - 실시간 라이브 현황과 최근 시작/종료 흐름을 함께 보여준다.
 * - 문제 방송은 검색된 목록에서 바로 추적하고 강제 종료할 수 있다.
 */
export default async function AdminStreamsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const rawPage = Number(searchParams.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const query = searchParams.q || "";
  const [result, insights] = await Promise.all([
    getStreamsAdminAction(page, query),
    getStreamsAdminInsightsAction(),
  ]);

  if (!result.success || !insights.success || !insights.data) {
    return (
      <AdminErrorState
        title="실시간 방송 관리"
        description="현재 송출 중인 방송을 모니터링하고 강제 종료할 수 있습니다."
        message="방송 관리 데이터를 불러오지 못했습니다."
      />
    );
  }

  const streamData = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">
          실시간 방송 관리
        </h2>
        <p className="mt-1 text-sm text-muted">
          현재 송출 중인 방송을 모니터링하고 강제 종료할 수 있습니다.
        </p>
      </div>
      <AdminScopeNotice description="상단 인사이트는 최근 7일 운영 흐름과 전체 라이브 분포 기준이며, 아래 목록은 현재 검색 조건에 맞는 진행 중 방송만 보여줍니다." />

      <StreamInsightHeader
        labels={insights.data.labels}
        startsSeries={insights.data.startsSeries}
        categorySlices={insights.data.categorySlices}
        summary={insights.data.summary}
      />

      <AdminStreamListContainer data={streamData} />
    </div>
  );
}
