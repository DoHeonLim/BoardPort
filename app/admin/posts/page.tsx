/**
 * File Name : app/admin/posts/page.tsx
 * Description : 관리자 게시글 관리 페이지
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   게시글 목록 조회 및 UI 컨테이너 연결
 */

import { redirect } from "next/navigation";
import PostListContainer from "@/features/report/components/admin/PostListContainer";
import { getPostsAdminAction } from "@/features/post/actions/admin";

export const dynamic = "force-dynamic";

/**
 * 게시글 관리 페이지
 * - 커뮤니티 전체 게시글을 조회
 * - 운영 정책 위반 게시글을 강제 삭제하고 기록을 남김
 */
export default async function AdminPostsPage({
  searchParams,
}: {
  searchParams: { page?: string; q?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const query = searchParams.q || "";

  const result = await getPostsAdminAction(page, query);

  if (!result.success) {
    redirect("/");
  }

  const postData = result.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
          게시글 관리
        </h2>
        <p className="text-sm text-neutral-500 mt-1">
          커뮤니티 게시글을 조회하고 관리할 수 있습니다.
        </p>
      </div>

      <PostListContainer data={postData} />
    </div>
  );
}
