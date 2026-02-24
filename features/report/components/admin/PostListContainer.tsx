/**
 * File Name : features/post/components/admin/PostListContainer.tsx
 * Description : 관리자용 게시글 목록 테이블 및 삭제 핸들링 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   게시글 목록 조회 및 삭제 모달 연동
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  TrashIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import TimeAgo from "@/components/ui/TimeAgo";
import AdminSearchBar from "@/features/report/components/admin/AdminSearchBar";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import AdminActionModal from "@/features/report/components/admin/AdminActionModal";
import { deletePostAdminAction } from "@/features/post/actions/admin";
import { POST_CATEGORY, PostCategoryType } from "@/features/post/constants";
import type { AdminPostListResponse } from "@/features/post/types";

interface PostListContainerProps {
  data: AdminPostListResponse;
}

/**
 * 관리자 게시글 목록 컨테이너
 *
 * [기능]
 * 1. 게시글 정보(ID, 카테고리, 제목, 작성자, 조회수, 작성일) 테이블 렌더링
 * 2. 원본 게시글 바로가기 링크 제공
 * 3. 삭제 버튼 클릭 시 `AdminActionModal`을 호출하여 사유 입력 후 강제 삭제 수행
 * 4. 검색바 및 페이지네이션 통합
 */
export default function PostListContainer({ data }: PostListContainerProps) {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const handleDelete = async (reason: string) => {
    if (!deleteTarget) return;
    const res = await deletePostAdminAction(deleteTarget.id, reason);
    if (res.success) {
      toast.success("게시글 삭제 완료");
      setDeleteTarget(null);
    } else toast.error(res.error);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <AdminSearchBar placeholder="제목 또는 작성자 검색" />
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4 w-16">ID</th>
                <th className="px-6 py-4 w-32">카테고리</th>
                <th className="px-6 py-4">제목</th>
                <th className="px-6 py-4 w-32">작성자</th>
                <th className="px-6 py-4 w-24 text-center">조회수</th>
                <th className="px-6 py-4 w-32">작성일</th>
                <th className="px-6 py-4 w-20 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-muted">
                    등록된 게시글이 없습니다.
                  </td>
                </tr>
              ) : (
                data.items.map((post) => (
                  <tr
                    key={post.id}
                    className="hover:bg-surface-dim/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-muted font-mono text-xs">
                      #{post.id}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-brand/10 text-brand dark:text-brand-light">
                        {POST_CATEGORY[post.category as PostCategoryType] ||
                          post.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-sm">
                        <span className="truncate font-semibold text-primary">
                          {post.title}
                        </span>
                        <Link
                          href={`/posts/${post.id}`}
                          target="_blank"
                          className="text-muted hover:text-brand transition-colors"
                        >
                          <ArrowTopRightOnSquareIcon className="size-4" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-primary">
                      {post.user.username}
                    </td>
                    <td className="px-6 py-4 text-center text-muted">
                      {post.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-muted">
                      <TimeAgo date={post.created_at} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          setDeleteTarget({ id: post.id, title: post.title })
                        }
                        className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      >
                        <TrashIcon className="size-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdminPagination
        currentPage={data.currentPage}
        totalPages={data.totalPages}
      />

      <AdminActionModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="게시글 강제 삭제"
        description={`'${deleteTarget?.title}' 게시글을 삭제하시겠습니까?`}
        confirmLabel="삭제 확정"
        confirmVariant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
