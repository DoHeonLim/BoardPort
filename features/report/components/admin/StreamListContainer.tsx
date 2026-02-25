/**
 * File Name : features/stream/components/admin/StreamListContainer.tsx
 * Description : 관리자용 방송 목록 테이블 및 강제 종료 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   방송 목록 및 강제 종료 구현
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
import { deleteStreamAdminAction } from "@/features/stream/actions/admin";
import type { AdminStreamListResponse } from "@/features/stream/types";

interface StreamListContainerProps {
  data: AdminStreamListResponse;
}

/**
 * 관리자 방송 목록 컨테이너
 *
 * [기능]
 * 1. 현재 방송 중(CONNECTED)인 스트림 목록 테이블 렌더링
 * 2. 방송 제목, 스트리머, 시작 시간 정보 표시 및 상세 이동 링크 제공
 * 3. '강제 종료' 버튼 클릭 시 `AdminActionModal`을 호출하여 방송 중단 처리
 * 4. 검색바 및 페이지네이션 통합
 */
export default function StreamListContainer({
  data,
}: StreamListContainerProps) {
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);

  const handleDelete = async (reason: string) => {
    if (!deleteTarget) return;

    const res = await deleteStreamAdminAction(deleteTarget.id, reason);
    if (res.success) {
      toast.success("방송을 강제 종료했습니다.");
      setDeleteTarget(null);
    } else {
      toast.error(res.error ?? "종료에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <AdminSearchBar placeholder="방송명 또는 스트리머 검색" />
      </div>

      <div className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border">
              <tr>
                <th className="px-6 py-4 w-16">ID</th>
                <th className="px-6 py-4">방송 제목</th>
                <th className="px-6 py-4 w-32">스트리머</th>
                <th className="px-6 py-4 w-24">상태</th>
                <th className="px-6 py-4 w-32">시작 시간</th>
                <th className="px-6 py-4 w-20 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted">
                    현재 진행 중인 방송이 없습니다.
                  </td>
                </tr>
              ) : (
                data.items.map((stream) => (
                  <tr
                    key={stream.id}
                    className="hover:bg-surface-dim/30 transition-colors"
                  >
                    <td className="px-6 py-4 text-muted font-mono text-xs">
                      #{stream.id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 max-w-sm">
                        <span className="truncate font-semibold text-primary">
                          {stream.title}
                        </span>
                        <Link
                          href={`/streams/${stream.id}`}
                          target="_blank"
                          className="text-muted hover:text-brand"
                        >
                          <ArrowTopRightOnSquareIcon className="size-4" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-primary font-medium">
                      {stream.user.username}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded text-[10px] font-bold bg-danger/10 text-danger animate-pulse">
                        LIVE
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted">
                      {stream.started_at ? (
                        <TimeAgo date={stream.started_at} />
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            id: stream.id,
                            title: stream.title,
                          })
                        }
                        className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg"
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
        title="방송 강제 종료"
        description={`'${deleteTarget?.title}' 방송을 강제로 종료하시겠습니까?`}
        confirmLabel="종료 확정"
        confirmVariant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
