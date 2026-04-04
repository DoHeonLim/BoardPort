/**
 * File Name : app/admin/posts/page.tsx
 * Description : 관리자 게시글 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   게시글 목록 조회 및 UI 컨테이너 연결
 * 2026.03.23  임도헌   Modified  page 쿼리를 1 이상의 정수로 정규화해 음수 skip 예외를 방지
 * 2026.03.30  임도헌   Modified  검색 기준 안내와 작성자 ID 노출 흐름에 맞춰 운영 추적 문맥을 보강
 */

import { redirect } from "next/navigation";
import AdminPostListContainer from "@/features/report/components/admin/AdminPostListContainer";
import AdminScopeNotice from "@/features/report/components/admin/AdminScopeNotice";
import { getPostsAdminAction } from "@/features/post/actions/admin";

export const dynamic = "force-dynamic";

/**
 * 게시글 관리 페이지
 * - 커뮤니티 전체 게시글을 조회
 * - 검색된 목록에서 작성자 추적 후 운영 정책 위반 게시글을 강제 삭제하고 기록을 남김
 */
export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const rawPage = Number(searchParams.page);
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const query = searchParams.q || "";

  const result = await getPostsAdminAction(page, query);

  if (!result.success) {
    redirect("/");
  }

  const postData = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-primary">
          게시글 관리
        </h2>
        <p className="mt-1 text-sm text-muted">
          커뮤니티 게시글을 조회하고 관리할 수 있습니다.
        </p>
      </div>
      <AdminScopeNotice description="아래 목록은 현재 검색어 기준으로 좁혀진 게시글만 보여주며, 원본 보기를 통해 실제 게시글 화면으로 바로 이동할 수 있습니다." />

      <AdminPostListContainer data={postData} />
    </div>
  );
}
