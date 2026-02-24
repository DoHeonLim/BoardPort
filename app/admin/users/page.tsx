/**
 * File Name : app/admin/users/page.tsx
 * Description : 관리자 유저 관리 페이지
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.06  임도헌   Created   유저 목록 조회
 */
import { getUsersAdminAction } from "@/features/user/actions/admin";
import UserListContainer from "@/features/user/components/admin/UserListContainer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * 유저 관리 페이지
 * - 전체 회원을 조회하고 검색(닉네임/이메일) 및 역할(Role) 필터링을 지원
 * - `UserListContainer`를 통해 권한 변경 및 이용 정지(Ban) 액션을 수행
 */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { query?: string; role?: string; page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const filter = {
    page,
    query: searchParams.query,
    role: (searchParams.role as any) || "ALL",
  };

  const result = await getUsersAdminAction(filter);

  if (!result.success || !result.data) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          유저 관리
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          전체 회원을 조회하고 권한 및 상태를 관리하세요.
        </p>
      </div>

      <UserListContainer data={result.data} searchParams={searchParams} />
    </div>
  );
}
