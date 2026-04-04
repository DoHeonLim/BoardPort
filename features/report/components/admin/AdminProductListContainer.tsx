/**
 * File Name : features/report/components/admin/AdminProductListContainer.tsx
 * Description : 관리자용 상품 목록 테이블 및 삭제 핸들링 UI
 * Author : 임도헌
 *
 * History
 * Date        Author   Status    Description
 * 2026.02.07  임도헌   Created   상품 목록 조회, 링크 연결, 삭제 모달 연동
 * 2026.03.13  임도헌   Modified  관리자 목록에서 상품 상세 진입 시 현재 목록 경로를 returnTo로 함께 전달
 * 2026.03.18  임도헌   Modified  강제 삭제 후 현재 테이블 즉시 제거와 서버 목록 재동기화로 운영 피드백 지연과 stale state를 함께 완화
 * 2026.03.19  임도헌   Modified  관리자 상품 목록 현재 경로도 내부 경로 기준으로 정규화해 raw returnTo 재전파를 방지
 * 2026.03.23  임도헌   Modified  관리자 상품 테이블 셸과 리스트 구분선을 구조선 기준으로 border-border-subtle에 맞춰 정리
 * 2026.03.29  임도헌   Modified  모바일 카드형 분기와 관리자 전용 네이밍 정리로 상품 목록 운영 UX를 정비
 * 2026.03.30  임도헌   Modified  판매자 ID 뱃지를 함께 노출해 감사 로그·신고·유저 관리와 식별자 문법을 통일
 * 2026.04.04  임도헌   Modified  관리자 삭제 성공 토스트를 사용자 영역과 같은 완료 문법으로 정리
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
import { deleteProductAdminAction } from "@/features/product/actions/admin";
import { cn, formatToWon } from "@/lib/utils";
import type { AdminProductListResponse } from "@/features/product/types";

interface AdminProductListContainerProps {
  data: AdminProductListResponse;
}

/**
 * 관리자 상품 목록 컨테이너
 *
 * [기능]
 * 1. 검색과 페이지네이션을 포함한 관리자 상품 목록을 데스크톱 테이블/모바일 카드형으로 렌더링
 * 2. 상품 상세와 판매자 프로필 바로가기, 판매자 ID 식별자까지 함께 제공
 * 3. 삭제 버튼 클릭 시 `AdminActionModal`을 통해 사유 입력 및 강제 삭제 수행
 */
export default function AdminProductListContainer({
  data,
}: AdminProductListContainerProps) {
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
    const res = await deleteProductAdminAction(deleteTarget.id, reason);
    if (res.success) {
      toast.success("상품을 삭제했습니다.");
      // 현재 목록 즉시 제거
      // revalidate와 별개로 화면에서도 먼저 제거해 삭제 피드백을 즉시 체감하게 유지
      setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else toast.error(res.error);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <AdminSearchBar placeholder="상품명, 판매자 또는 ID 검색" />
      </div>

      <div className="space-y-4 md:hidden">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-surface px-5 py-16 text-center text-sm text-muted shadow-sm">
            {hasQuery
              ? "검색 조건에 맞는 상품이 없습니다."
              : "등록된 상품이 없습니다."}
          </div>
        ) : (
          items.map((product) => {
            const isSold = !!product.purchase_userId;
            const isReserved = !!product.reservation_userId && !isSold;

            return (
              <article
                key={product.id}
                className="rounded-2xl border border-border-subtle bg-surface p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-surface-dim px-2 py-1 text-[10px] font-mono text-muted">
                        #{product.id}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-1 text-[10px] font-bold",
                          isSold
                            ? "bg-surface-dim text-muted"
                            : isReserved
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-brand/10 text-brand dark:text-brand-light"
                        )}
                      >
                        {isSold ? "판매완료" : isReserved ? "예약중" : "판매중"}
                      </span>
                    </div>
                    <div className="mt-3 flex items-start gap-2">
                      <h3 className="line-clamp-2 text-sm font-bold leading-6 text-primary">
                        {product.title}
                      </h3>
                      <Link
                        href={`/products/view/${product.id}?returnTo=${encodeURIComponent(returnTo)}`}
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
                        id: product.id,
                        title: product.title,
                      })
                    }
                    className="shrink-0 rounded-xl p-2 text-muted hover:bg-danger/10 hover:text-danger"
                    aria-label={`${product.title} 상품 삭제`}
                  >
                    <TrashIcon className="size-5" />
                  </button>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-surface-dim/30 px-3 py-3">
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                      판매자
                    </dt>
                    <dd className="mt-1 flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-primary">
                        {product.user.username}
                      </span>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-mono text-muted">
                        #{product.user.id}
                      </span>
                      <Link
                        href={`/profile/${product.user.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-muted transition-colors hover:text-brand"
                        aria-label={`${product.user.username} 프로필 보기`}
                      >
                        <ArrowTopRightOnSquareIcon className="size-4" />
                      </Link>
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                      가격
                    </dt>
                    <dd className="mt-1 truncate text-sm font-semibold text-brand dark:text-brand-light">
                      {formatToWon(product.price)}원
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                      등록일
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-primary">
                      <TimeAgo date={product.created_at} />
                    </dd>
                  </div>
                </dl>
              </article>
            );
          })
        )}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-dim text-muted font-bold border-b border-border-subtle">
              <tr>
                <th className="px-6 py-4 w-16">ID</th>
                <th className="px-6 py-4">상품명</th>
                <th className="px-6 py-4 w-32">판매자</th>
                <th className="px-6 py-4 w-32">가격</th>
                <th className="px-6 py-4 w-24">상태</th>
                <th className="px-6 py-4 w-32">등록일</th>
                <th className="px-6 py-4 w-20 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-muted">
                    {hasQuery
                      ? "검색 조건에 맞는 상품이 없습니다."
                      : "등록된 상품이 없습니다."}
                  </td>
                </tr>
              ) : (
                items.map((product) => {
                  const isSold = !!product.purchase_userId;
                  const isReserved = !!product.reservation_userId && !isSold;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-surface-dim/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-muted font-mono text-xs">
                        #{product.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 max-w-sm">
                          <span className="truncate font-semibold text-primary">
                            {product.title}
                          </span>
                          <Link
                            href={`/products/view/${product.id}?returnTo=${encodeURIComponent(returnTo)}`}
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
                          <span className="text-primary">
                            {product.user.username}
                          </span>
                          <span className="rounded-full bg-surface-dim px-2 py-0.5 text-[10px] font-mono text-muted">
                            #{product.user.id}
                          </span>
                          <Link
                            href={`/profile/${product.user.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-muted transition-colors hover:text-brand"
                            aria-label={`${product.user.username} 프로필 보기`}
                          >
                            <ArrowTopRightOnSquareIcon className="size-4" />
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-brand dark:text-brand-light">
                        {formatToWon(product.price)}원
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold",
                            isSold
                              ? "bg-surface-dim text-muted"
                              : isReserved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-brand/10 text-brand dark:text-brand-light"
                          )}
                        >
                          {isSold
                            ? "판매완료"
                            : isReserved
                              ? "예약중"
                              : "판매중"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        <TimeAgo date={product.created_at} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            setDeleteTarget({
                              id: product.id,
                              title: product.title,
                            })
                          }
                          className="p-2 text-muted hover:text-danger hover:bg-danger/10 rounded-lg"
                        >
                          <TrashIcon className="size-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
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
        title="상품 강제 삭제"
        description={`'${deleteTarget?.title}' 상품을 삭제하시겠습니까?`}
        confirmLabel="삭제 확정"
        confirmVariant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
