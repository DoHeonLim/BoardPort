/**
 * File Name : app/(app)/admin/users/page.tsx
 * Description : 관리자 유저 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   유저 목록 조회
 * 2026.03.23  임도헌   Modified  page 쿼리를 1 이상의 정수로 정규화해 음수 skip 예외를 방지
 * 2026.03.29  임도헌   Modified  최근 30일 가입 추이와 USER/ADMIN/BANNED 분포 인사이트 헤더를 추가
 * 2026.03.30  임도헌   Modified  role 칩 필터와 목록 기준 안내를 함께 노출해 인사이트·리스트 문맥을 보강
 * 2026.04.12  임도헌   Moved     파일 경로를 app/admin/users/page.tsx 에서 app/(app)/admin/users/page.tsx 로 변경 (라우트 그룹 개편)
*/
import AdminScopeNotice from "@/features/report/components/admin/AdminScopeNotice";
import AdminErrorState from "@/features/report/components/admin/AdminErrorState";
import {
  getUsersAdminAction,
  getUsersAdminInsightsAction,
} from "@/features/user/actions/admin";
import AdminUserListContainer from "@/features/user/components/admin/AdminUserListContainer";
import UserInsightHeader from "@/features/user/components/admin/UserInsightHeader";
import type { Role } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/**
 * 유저 관리 페이지
 * - 회원 유입과 상태 분포를 상단에서 먼저 읽게 구성
 * - 아래 리스트에서 검색, role 필터, 권한 변경, 이용 정지 액션을 수행
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { query?: string; role?: string; page?: string };
}) {
  const rawPage = Number(searchParams.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const filter = {
    page,
    query: searchParams.query,
    role: (searchParams.role as Role | "ALL" | "BANNED" | undefined) || "ALL",
  };

  const [result, insights] = await Promise.all([
    getUsersAdminAction(filter),
    getUsersAdminInsightsAction(),
  ]);

  if (!result.success || !result.data || !insights.success || !insights.data) {
    return (
      <AdminErrorState
        title="유저 관리"
        description="전체 회원을 조회하고 권한 및 상태를 관리하세요."
        message="유저 관리 데이터를 불러오지 못했습니다."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">
          유저 관리
        </h2>
        <p className="mt-1 text-sm text-muted">
          전체 회원을 조회하고 권한 및 상태를 관리하세요.
        </p>
      </div>
      <AdminScopeNotice description="상단 인사이트는 최근 30일 전체 회원 기준이며, 아래 목록은 현재 검색어와 권한 필터에 맞는 회원만 보여줍니다." />

      <UserInsightHeader
        labels={insights.data.labels}
        signupSeries={insights.data.signupSeries}
        statusSlices={insights.data.statusSlices}
        summary={insights.data.summary}
      />

      <AdminUserListContainer data={result.data} />
    </div>
  );
}

