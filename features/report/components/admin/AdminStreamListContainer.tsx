/**
 * File Name : features/report/components/admin/AdminStreamListContainer.tsx
 * Description : 관리자용 방송 목록 테이블 및 강제 종료 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   방송 목록 및 강제 종료 구현
 * 2026.03.13  임도헌   Modified  관리자 목록에서 방송 상세 진입 시 현재 목록 경로를 returnTo로 함께 전달
 * 2026.03.18  임도헌   Modified  강제 종료 후 현재 테이블 즉시 제거와 서버 목록 재동기화로 운영 피드백 지연과 stale state를 함께 완화
 * 2026.03.19  임도헌   Modified  관리자 방송 목록 현재 경로도 내부 경로 기준으로 정규화해 raw returnTo 재전파를 방지
 * 2026.03.23  임도헌   Modified  관리자 방송 테이블 셸과 리스트 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.29  임도헌   Modified  모바일 카드형 분기와 관리자 전용 네이밍 정리로 방송 목록 운영 UX를 정비
 * 2026.03.30  임도헌   Modified  카테고리 검색과 스트리머 ID 뱃지까지 포함해 방송 추적 문법을 확장
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  TrashIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import TimeAgo from "@/components/ui/TimeAgo";
import AdminSearchBar from "@/features/report/components/admin/AdminSearchBar";
import AdminPagination from "@/features/report/components/admin/AdminPagination";
import AdminActionModal from "@/features/report/components/admin/AdminActionModal";
import { sanitizeCallbackUrl } from "@/features/auth/utils/redirect";
import { deleteStreamAdminAction } from "@/features/stream/actions/admin";
import type { AdminStreamListResponse } from "@/features/stream/types";

interface AdminStreamListContainerProps {
  data: AdminStreamListResponse;
}

/**
 * 관리자 방송 목록 컨테이너
 *
 * [기능]
 * 1. 현재 방송 중(CONNECTED)인 목록을 검색·페이지네이션과 함께 데스크톱 테이블/모바일 카드형으로 렌더링
 * 2. 방송 제목, 스트리머 식별자, 시작 시간과 상세/방송국 링크를 함께 제공
 * 3. '강제 종료' 버튼 클릭 시 `AdminActionModal`을 호출하여 방송 중단을 처리
 */
export default function AdminStreamListContainer({
  data,
}: AdminStreamListContainerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [items, setItems] = useState(data.items);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    title: string;
  } | null>(null);
  const hasQuery = !!searchParams.get("q")?.trim();
  // 안전한 내부 복귀 경로
  // 상세 확인 뒤에도 현재 검색/페이지 문맥으로 되돌아올 수 있도록 내부 경로 기준 정규화
  const returnTo = sanitizeCallbackUrl(
    searchParams?.size ? `${pathname}?${searchParams.toString()}` : pathname
  );

  useEffect(() => {
    // 서버 목록 기준 로컬 상태 재동기화
    // 목록 재조회 뒤에도 카드/테이블 상태가 같은 기준을 바라보도록 동기화
    setItems(data.items);
    setDeleteTarget(null);
  }, [data.items]);

  const handleDelete = async (reason: string) => {
    if (!deleteTarget) return;

    const res = await deleteStreamAdminAction(deleteTarget.id, reason);
    if (res.success) {
      toast.success("방송을 강제 종료했습니다.");
      // 현재 목록 즉시 제거
      // revalidate와 별개로 화면에서도 먼저 제거해 종료 피드백을 즉시 체감하게 유지
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      toast.error(res.error ?? "종료에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <AdminSearchBar placeholder="방송명, 스트리머, 카테고리 또는 ID 검색" />
      </div>

      <div className="space-y-4 md:hidden">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-16 text-center text-sm text-muted shadow-sm">
            {hasQuery
              ? "검색 조건에 맞는 방송이 없습니다."
              : "현재 진행 중인 방송이 없습니다."}
          </div>
        ) : (
          items.map((stream) => (
            <article
              key={stream.id}
              className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-surface-dim px-2 py-1 text-[10px] font-mono text-muted">
                      #{stream.id}
                    </span>
                    <span className="rounded-full bg-danger/10 px-2 py-1 text-[10px] font-bold text-danger">
                      LIVE
                    </span>
                  </div>
                  <div className="mt-3 flex items-start gap-2">
                    <h3 className="line-clamp-2 text-sm font-bold leading-6 text-primary">
                      {stream.title}
                    </h3>
                    <Link
                      href={`/streams/${stream.id}?returnTo=${encodeURIComponent(returnTo)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 shrink-0 text-muted hover:text-brand"
                    >
                      <ArrowTopRightOnSquareIcon className="size-4" />
                    </Link>
                  </div>
                </div>
                <button
                  onClick={() =>
                    setDeleteTarget({
                      id: stream.id,
                      title: stream.title,
                    })
                  }
                  className="shrink-0 rounded-xl p-2 text-muted hover:bg-danger/10 hover:text-danger"
                  aria-label={`${stream.title} 방송 강제 종료`}
                >
                  <TrashIcon className="size-5" />
                </button>
              </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-surface-dim/30 px-3 py-3">
                  <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                    스트리머
                  </dt>
                    <dd className="mt-1 flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-primary">
                        {stream.user.username}
                      </span>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-mono text-muted">
                        #{stream.user.id}
                      </span>
                      <Link
                        href={`/profile/${stream.user.username}/channel`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted transition-colors hover:text-brand"
                        aria-label={`${stream.user.username} 방송국 보기`}
                      >
                        <ArrowTopRightOnSquareIcon className="size-4" />
                      </Link>
                    </dd>
                  </div>
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                    시작 시간
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-primary">
                    {stream.started_at ? <TimeAgo date={stream.started_at} /> : "-"}
                  </dd>
                </div>
              </dl>
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border-subtle">
              <tr>
                <th className="px-6 py-4 w-16">ID</th>
                <th className="px-6 py-4">방송 제목</th>
                <th className="px-6 py-4 w-32">스트리머</th>
                <th className="px-6 py-4 w-24">상태</th>
                <th className="px-6 py-4 w-32">시작 시간</th>
                <th className="px-6 py-4 w-20 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-muted">
                    {hasQuery
                      ? "검색 조건에 맞는 방송이 없습니다."
                      : "현재 진행 중인 방송이 없습니다."}
                  </td>
                </tr>
              ) : (
                items.map((stream) => (
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
                          href={`/streams/${stream.id}?returnTo=${encodeURIComponent(returnTo)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted hover:text-brand"
                        >
                          <ArrowTopRightOnSquareIcon className="size-4" />
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-primary">
                          {stream.user.username}
                        </span>
                        <span className="rounded-full bg-surface-dim px-2 py-0.5 text-[10px] font-mono text-muted">
                          #{stream.user.id}
                        </span>
                        <Link
                          href={`/profile/${stream.user.username}/channel`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted transition-colors hover:text-brand"
                          aria-label={`${stream.user.username} 방송국 보기`}
                        >
                          <ArrowTopRightOnSquareIcon className="size-4" />
                        </Link>
                      </div>
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
